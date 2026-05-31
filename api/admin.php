<?php
/**
 * Admin API - Administrative operations
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/storage.php';
require_once __DIR__ . '/../includes/memory.php';

session_start();
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

// Check authentication for protected actions
$protectedActions = ['dashboard', 'save_settings', 'manage_providers', 'backup', 'restore', 'logs'];
if (in_array($action, $protectedActions) && !isset($_SESSION['admin_logged_in'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$storage = StorageManager::getInstance();

try {
    switch ($action) {
        case 'login':
            handleLogin();
            break;
            
        case 'logout':
            handleLogout();
            break;
            
        case 'check_auth':
            handleCheckAuth();
            break;
            
        case 'dashboard':
            handleDashboard($storage);
            break;
            
        case 'get_settings':
            handleGetSettings($storage);
            break;
            
        case 'save_settings':
            handleSaveSettings($storage);
            break;
            
        case 'get_providers':
            handleGetProviders($storage);
            break;
            
        case 'save_provider':
            handleSaveProvider($storage);
            break;
            
        case 'delete_provider':
            handleDeleteProvider($storage);
            break;
            
        case 'toggle_provider':
            handleToggleProvider($storage);
            break;
            
        case 'test_provider':
            handleTestProvider($storage);
            break;
            
        case 'get_all_chats':
            handleGetAllChats($storage);
            break;
            
        case 'get_chat_detail':
            handleGetChatDetail($storage);
            break;
            
        case 'delete_chat':
            handleAdminDeleteChat($storage);
            break;
            
        case 'get_all_memories':
            handleGetAllMemories($storage);
            break;
            
        case 'update_memory':
            handleAdminUpdateMemory($storage);
            break;
            
        case 'delete_memory':
            handleAdminDeleteMemory($storage);
            break;
            
        case 'create_backup':
            handleCreateBackup($storage);
            break;
            
        case 'list_backups':
            handleListBackups($storage);
            break;
            
        case 'restore_backup':
            handleRestoreBackup($storage);
            break;
            
        case 'delete_backup':
            handleDeleteBackup($storage);
            break;
            
        case 'get_logs':
            handleGetLogs();
            break;
            
        case 'clear_logs':
            handleClearLogs();
            break;
            
        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}

function handleLogin() {
    $input = json_decode(file_get_contents('php://input'), true);
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';
    
    if ($username === ADMIN_USERNAME && password_verify($password, ADMIN_PASSWORD_HASH)) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_username'] = $username;
        $_SESSION['login_time'] = time();
        
        echo json_encode(['success' => true]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials']);
    }
}

function handleLogout() {
    session_destroy();
    echo json_encode(['success' => true]);
}

function handleCheckAuth() {
    echo json_encode([
        'authenticated' => isset($_SESSION['admin_logged_in']),
        'username' => $_SESSION['admin_username'] ?? null
    ]);
}

function handleDashboard($storage) {
    $chats = $storage->getChats();
    $memories = $storage->getMemories();
    $settings = $storage->getUserSettings();
    $aiConfig = $storage->getAIConfig();
    $adminSettings = $storage->getAdminSettings();
    
    // Count total messages
    $totalMessages = 0;
    foreach ($chats as $chat) {
        $chatData = $storage->getChat($chat['id']);
        $totalMessages += count($chatData['messages'] ?? []);
    }
    
    // Calculate storage usage
    $storageUsage = 0;
    foreach (glob(DATA_PATH . '*.json') as $file) {
        $storageUsage += filesize($file);
    }
    foreach (glob(DATA_PATH . '*/*.json') as $file) {
        $storageUsage += filesize($file);
    }
    
    // Get recent activity
    $recentChats = array_slice($chats, 0, 5);
    
    echo json_encode([
        'stats' => [
            'total_chats' => count($chats),
            'total_messages' => $totalMessages,
            'total_memories' => count($memories),
            'storage_usage' => $storageUsage,
            'storage_usage_formatted' => formatBytes($storageUsage)
        ],
        'recent_chats' => $recentChats,
        'providers' => array_filter($adminSettings['providers'] ?? [], function($p) {
            return $p['enabled'] ?? false;
        }),
        'ai_config' => $aiConfig
    ]);
}

function handleGetSettings($storage) {
    $settings = $storage->getAdminSettings();
    echo json_encode(['settings' => $settings]);
}

function handleSaveSettings($storage) {
    $input = json_decode(file_get_contents('php://input'), true);
    $storage->saveAdminSettings($input);
    echo json_encode(['success' => true]);
}

function handleGetProviders($storage) {
    $settings = $storage->getAdminSettings();
    echo json_encode(['providers' => $settings['providers'] ?? []]);
}

function handleSaveProvider($storage) {
    $input = json_decode(file_get_contents('php://input'), true);
    $settings = $storage->getAdminSettings();
    
    $found = false;
    foreach ($settings['providers'] as &$provider) {
        if ($provider['id'] === $input['id']) {
            $provider = array_merge($provider, $input);
            $found = true;
            break;
        }
    }
    
    if (!$found) {
        $settings['providers'][] = $input;
    }
    
    $storage->saveAdminSettings($settings);
    echo json_encode(['success' => true]);
}

function handleDeleteProvider($storage) {
    $input = json_decode(file_get_contents('php://input'), true);
    $settings = $storage->getAdminSettings();
    
    $settings['providers'] = array_values(array_filter($settings['providers'], function($p) use ($input) {
        return $p['id'] !== $input['id'];
    }));
    
    $storage->saveAdminSettings($settings);
    echo json_encode(['success' => true]);
}

function handleToggleProvider($storage) {
    $input = json_decode(file_get_contents('php://input'), true);
    $settings = $storage->getAdminSettings();
    
    foreach ($settings['providers'] as &$provider) {
        if ($provider['id'] === $input['id']) {
            $provider['enabled'] = $input['enabled'];
            break;
        }
    }
    
    $storage->saveAdminSettings($settings);
    echo json_encode(['success' => true]);
}

function handleTestProvider($storage) {
    $input = json_decode(file_get_contents('php://input'), true);
    $settings = $storage->getAdminSettings();
    
    foreach ($settings['providers'] as $provider) {
        if ($provider['id'] === $input['id']) {
            $url = rtrim($provider['base_url'], '/') . '/models';
            
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $provider['api_key']
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);
            
            echo json_encode([
                'success' => $httpCode === 200,
                'http_code' => $httpCode,
                'error' => $error
            ]);
            return;
        }
    }
    
    echo json_encode(['success' => false, 'error' => 'Provider not found']);
}

function handleGetAllChats($storage) {
    $chats = $storage->getChats();
    
    usort($chats, function($a, $b) {
        return $b['updated_at'] <=> $a['updated_at'];
    });
    
    echo json_encode(['chats' => $chats]);
}

function handleGetChatDetail($storage) {
    $chatId = $_GET['id'] ?? '';
    
    if (!$chatId) {
        throw new Exception('Chat ID required');
    }
    
    $chat = $storage->getChat($chatId);
    
    if (!$chat) {
        throw new Exception('Chat not found');
    }
    
    echo json_encode(['chat' => $chat]);
}

function handleAdminDeleteChat($storage) {
    $input = json_decode(file_get_contents('php://input'), true);
    $chatId = $input['id'] ?? '';
    
    if (!$chatId) {
        throw new Exception('Chat ID required');
    }
    
    $storage->delete('chats/' . $chatId);
    
    $chats = $storage->getChats();
    $chats = array_values(array_filter($chats, function($c) use ($chatId) {
        return $c['id'] !== $chatId;
    }));
    $storage->saveChatIndex($chats);
    
    echo json_encode(['success' => true]);
}

function handleGetAllMemories($storage) {
    $memories = $storage->getMemories();
    
    usort($memories, function($a, $b) {
        return $b['importance'] <=> $a['importance'];
    });
    
    echo json_encode(['memories' => $memories]);
}

function handleAdminUpdateMemory($storage) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? '';
    $updates = $input['updates'] ?? [];
    
    if (!$id) {
        throw new Exception('Memory ID required');
    }
    
    $memories = $storage->getMemories();
    
    foreach ($memories as &$memory) {
        if ($memory['id'] === $id) {
            $memory = array_merge($memory, $updates);
            $memory['updated_at'] = time();
            break;
        }
    }
    
    $storage->saveMemories($memories);
    echo json_encode(['success' => true]);
}

function handleAdminDeleteMemory($storage) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? '';
    
    if (!$id) {
        throw new Exception('Memory ID required');
    }
    
    $memories = $storage->getMemories();
    $memories = array_values(array_filter($memories, function($m) use ($id) {
        return $m['id'] !== $id;
    }));
    $storage->saveMemories($memories);
    
    echo json_encode(['success' => true]);
}

function handleCreateBackup($storage) {
    $backupName = $storage->createBackup();
    echo json_encode(['success' => true, 'backup_name' => $backupName]);
}

function handleListBackups($storage) {
    $backups = $storage->listBackups();
    
    $backupInfo = [];
    foreach ($backups as $backup) {
        $data = $storage->load('backups/' . pathinfo($backup, PATHINFO_FILENAME));
        $backupInfo[] = [
            'name' => $backup,
            'timestamp' => $data['timestamp'] ?? 0,
            'chat_count' => count($data['chats'] ?? []),
            'memory_count' => count($data['memories'] ?? [])
        ];
    }
    
    usort($backupInfo, function($a, $b) {
        return $b['timestamp'] <=> $a['timestamp'];
    });
    
    echo json_encode(['backups' => $backupInfo]);
}

function handleRestoreBackup($storage) {
    $input = json_decode(file_get_contents('php://input'), true);
    $backupName = $input['backup_name'] ?? '';
    
    if (!$backupName) {
        throw new Exception('Backup name required');
    }
    
    $result = $storage->restoreBackup(pathinfo($backupName, PATHINFO_FILENAME));
    
    if ($result) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Failed to restore backup']);
    }
}

function handleDeleteBackup($storage) {
    $input = json_decode(file_get_contents('php://input'), true);
    $backupName = $input['backup_name'] ?? '';
    
    if (!$backupName) {
        throw new Exception('Backup name required');
    }
    
    $storage->delete('backups/' . pathinfo($backupName, PATHINFO_FILENAME));
    echo json_encode(['success' => true]);
}

function handleGetLogs() {
    $date = $_GET['date'] ?? date('Y-m-d');
    $logFile = DATA_PATH . 'logs/' . $date . '.log';
    
    if (!file_exists($logFile)) {
        echo json_encode(['logs' => []]);
        return;
    }
    
    $logs = [];
    $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    
    foreach ($lines as $line) {
        $entry = json_decode($line, true);
        if ($entry) {
            $logs[] = $entry;
        }
    }
    
    // Get last 100 entries
    $logs = array_slice(array_reverse($logs), 0, 100);
    
    echo json_encode(['logs' => $logs]);
}

function handleClearLogs() {
    $logFile = DATA_PATH . 'logs/' . date('Y-m-d') . '.log';
    
    if (file_exists($logFile)) {
        file_put_contents($logFile, '');
    }
    
    echo json_encode(['success' => true]);
}

function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
        $bytes /= 1024;
    }
    
    return round($bytes, $precision) . ' ' . $units[$i];
}
