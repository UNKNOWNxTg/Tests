<?php
/**
 * Chat API - Handle all chat operations
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/storage.php';
require_once __DIR__ . '/../includes/memory.php';
require_once __DIR__ . '/../includes/api.php';

header('Content-Type: application/json');

// Get request method and action
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

$storage = StorageManager::getInstance();
$memoryManager = new MemoryManager();
$apiManager = new APIManager();

try {
    switch ($action) {
        case 'get_chats':
            handleGetChats($storage);
            break;
            
        case 'create_chat':
            handleCreateChat($storage);
            break;
            
        case 'get_chat':
            handleGetChat($storage);
            break;
            
        case 'save_chat':
            handleSaveChat($storage);
            break;
            
        case 'delete_chat':
            handleDeleteChat($storage);
            break;
            
        case 'rename_chat':
            handleRenameChat($storage);
            break;
            
        case 'pin_chat':
            handlePinChat($storage);
            break;
            
        case 'send_message':
            handleSendMessage($storage, $memoryManager, $apiManager);
            break;
            
        case 'edit_message':
            handleEditMessage($storage);
            break;
            
        case 'delete_message':
            handleDeleteMessage($storage);
            break;
            
        case 'regenerate':
            handleRegenerate($storage, $memoryManager, $apiManager);
            break;
            
        case 'get_memories':
            handleGetMemories($memoryManager);
            break;
            
        case 'add_memory':
            handleAddMemory($memoryManager);
            break;
            
        case 'update_memory':
            handleUpdateMemory($memoryManager);
            break;
            
        case 'delete_memory':
            handleDeleteMemory($memoryManager);
            break;
            
        case 'search_memories':
            handleSearchMemories($memoryManager);
            break;
            
        case 'get_settings':
            handleGetSettings($storage);
            break;
            
        case 'save_settings':
            handleSaveSettings($storage);
            break;
            
        case 'get_ai_config':
            handleGetAIConfig($storage);
            break;
            
        case 'save_ai_config':
            handleSaveAIConfig($storage);
            break;
            
        case 'upload_image':
            handleUploadImage();
            break;
            
        case 'export_data':
            handleExportData($storage, $memoryManager);
            break;
            
        case 'import_data':
            handleImportData($storage, $memoryManager);
            break;
            
        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}

function handleGetChats($storage) {
    $chats = $storage->getChats();
    
    // Sort by pinned first, then by updated_at descending
    usort($chats, function($a, $b) {
        if ($a['pinned'] && !$b['pinned']) return -1;
        if (!$a['pinned'] && $b['pinned']) return 1;
        return $b['updated_at'] <=> $a['updated_at'];
    });
    
    echo json_encode(['chats' => $chats]);
}

function handleCreateChat($storage) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $chatId = 'chat_' . uniqid() . '_' . time();
    $chat = [
        'id' => $chatId,
        'title' => $input['title'] ?? 'New Conversation',
        'messages' => [],
        'created_at' => time(),
        'updated_at' => time(),
        'pinned' => false
    ];
    
    $chats = $storage->getChats();
    $chats[] = $chat;
    $storage->saveChatIndex($chats);
    $storage->saveChat($chatId, $chat);
    
    echo json_encode(['chat' => $chat]);
}

function handleGetChat($storage) {
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

function handleSaveChat($storage) {
    $input = json_decode(file_get_contents('php://input'), true);
    $chatId = $input['id'] ?? '';
    
    if (!$chatId) {
        throw new Exception('Chat ID required');
    }
    
    $chat = $storage->getChat($chatId);
    if (!$chat) {
        throw new Exception('Chat not found');
    }
    
    $chat['messages'] = $input['messages'] ?? $chat['messages'];
    $chat['title'] = $input['title'] ?? $chat['title'];
    $chat['updated_at'] = time();
    
    $storage->saveChat($chatId, $chat);
    
    // Update index
    $chats = $storage->getChats();
    foreach ($chats as &$c) {
        if ($c['id'] === $chatId) {
            $c['title'] = $chat['title'];
            $c['updated_at'] = $chat['updated_at'];
            break;
        }
    }
    $storage->saveChatIndex($chats);
    
    echo json_encode(['success' => true, 'chat' => $chat]);
}

function handleDeleteChat($storage) {
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

function handleRenameChat($storage) {
    $input = json_decode(file_get_contents('php://input'), true);
    $chatId = $input['id'] ?? '';
    $title = $input['title'] ?? '';
    
    if (!$chatId || !$title) {
        throw new Exception('Chat ID and title required');
    }
    
    $chat = $storage->getChat($chatId);
    if (!$chat) {
        throw new Exception('Chat not found');
    }
    
    $chat['title'] = $title;
    $storage->saveChat($chatId, $chat);
    
    $chats = $storage->getChats();
    foreach ($chats as &$c) {
        if ($c['id'] === $chatId) {
            $c['title'] = $title;
            break;
        }
    }
    $storage->saveChatIndex($chats);
    
    echo json_encode(['success' => true]);
}

function handlePinChat($storage) {
    $input = json_decode(file_get_contents('php://input'), true);
    $chatId = $input['id'] ?? '';
    $pinned = $input['pinned'] ?? false;
    
    if (!$chatId) {
        throw new Exception('Chat ID required');
    }
    
    $chat = $storage->getChat($chatId);
    if (!$chat) {
        throw new Exception('Chat not found');
    }
    
    $chat['pinned'] = $pinned;
    $storage->saveChat($chatId, $chat);
    
    $chats = $storage->getChats();
    foreach ($chats as &$c) {
        if ($c['id'] === $chatId) {
            $c['pinned'] = $pinned;
            break;
        }
    }
    $storage->saveChatIndex($chats);
    
    echo json_encode(['success' => true]);
}

function handleSendMessage($storage, $memoryManager, $apiManager) {
    $input = json_decode(file_get_contents('php://input'), true);
    $chatId = $input['chat_id'] ?? '';
    $content = $input['content'] ?? '';
    
    if (!$chatId || !$content) {
        throw new Exception('Chat ID and content required');
    }
    
    $chat = $storage->getChat($chatId);
    if (!$chat) {
        throw new Exception('Chat not found');
    }
    
    // Add user message
    $userMessage = [
        'id' => 'msg_' . uniqid(),
        'role' => 'user',
        'content' => $content,
        'timestamp' => time()
    ];
    
    $chat['messages'][] = $userMessage;
    
    // Extract memories
    $memoryManager->extractMemories($chat['messages'], $storage->getAIConfig());
    
    // Set headers for streaming
    header('Content-Type: text/event-stream');
    header('Cache-Control: no-cache');
    header('X-Accel-Buffering: no');
    
    // Send user message confirmation
    echo "data: " . json_encode([
        'type' => 'message',
        'message' => $userMessage
    ]) . "\n\n";
    ob_flush();
    flush();
    
    // Get AI response with streaming
    $options = [
        'temperature' => $input['temperature'] ?? null,
        'max_tokens' => $input['max_tokens'] ?? null
    ];
    
    $apiManager->sendMessage($chat['messages'], $options);
    
    // Save chat after response
    $chat['updated_at'] = time();
    
    // Auto-generate title from first message
    if (count($chat['messages']) === 1) {
        $chat['title'] = substr($content, 0, 50) . (strlen($content) > 50 ? '...' : '');
    }
    
    $storage->saveChat($chatId, $chat);
    
    // Update index
    $chats = $storage->getChats();
    foreach ($chats as &$c) {
        if ($c['id'] === $chatId) {
            $c['title'] = $chat['title'];
            $c['updated_at'] = $chat['updated_at'];
            break;
        }
    }
    $storage->saveChatIndex($chats);
}

function handleEditMessage($storage) {
    $input = json_decode(file_get_contents('php://input'), true);
    $chatId = $input['chat_id'] ?? '';
    $messageId = $input['message_id'] ?? '';
    $content = $input['content'] ?? '';
    
    if (!$chatId || !$messageId || !$content) {
        throw new Exception('Chat ID, message ID, and content required');
    }
    
    $chat = $storage->getChat($chatId);
    if (!$chat) {
        throw new Exception('Chat not found');
    }
    
    foreach ($chat['messages'] as &$msg) {
        if ($msg['id'] === $messageId) {
            $msg['content'] = $content;
            $msg['edited'] = true;
            break;
        }
    }
    
    $chat['updated_at'] = time();
    $storage->saveChat($chatId, $chat);
    
    echo json_encode(['success' => true]);
}

function handleDeleteMessage($storage) {
    $input = json_decode(file_get_contents('php://input'), true);
    $chatId = $input['chat_id'] ?? '';
    $messageId = $input['message_id'] ?? '';
    
    if (!$chatId || !$messageId) {
        throw new Exception('Chat ID and message ID required');
    }
    
    $chat = $storage->getChat($chatId);
    if (!$chat) {
        throw new Exception('Chat not found');
    }
    
    $chat['messages'] = array_values(array_filter($chat['messages'], function($m) use ($messageId) {
        return $m['id'] !== $messageId;
    }));
    
    $chat['updated_at'] = time();
    $storage->saveChat($chatId, $chat);
    
    echo json_encode(['success' => true]);
}

function handleRegenerate($storage, $memoryManager, $apiManager) {
    $input = json_decode(file_get_contents('php://input'), true);
    $chatId = $input['chat_id'] ?? '';
    $messageId = $input['message_id'] ?? '';
    
    if (!$chatId || !$messageId) {
        throw new Exception('Chat ID and message ID required');
    }
    
    $chat = $storage->getChat($chatId);
    if (!$chat) {
        throw new Exception('Chat not found');
    }
    
    // Find the message to regenerate after
    $messageIndex = -1;
    foreach ($chat['messages'] as $i => $msg) {
        if ($msg['id'] === $messageId) {
            $messageIndex = $i;
            break;
        }
    }
    
    if ($messageIndex === -1) {
        throw new Exception('Message not found');
    }
    
    // Remove messages after the selected one
    $chat['messages'] = array_slice($chat['messages'], 0, $messageIndex + 1);
    
    // Save intermediate state
    $chat['updated_at'] = time();
    $storage->saveChat($chatId, $chat);
    
    // Set headers for streaming
    header('Content-Type: text/event-stream');
    header('Cache-Control: no-cache');
    header('X-Accel-Buffering: no');
    
    // Get AI response
    $options = [
        'temperature' => $input['temperature'] ?? null,
        'max_tokens' => $input['max_tokens'] ?? null
    ];
    
    $apiManager->sendMessage($chat['messages'], $options);
    
    // Save final state
    $chat['updated_at'] = time();
    $storage->saveChat($chatId, $chat);
}

function handleGetMemories($memoryManager) {
    $memories = $memoryManager->getMemories();
    echo json_encode(['memories' => $memories]);
}

function handleAddMemory($memoryManager) {
    $input = json_decode(file_get_contents('php://input'), true);
    $content = $input['content'] ?? '';
    $type = $input['type'] ?? 'general';
    $importance = $input['importance'] ?? 0.5;
    
    if (!$content) {
        throw new Exception('Content required');
    }
    
    $memory = $memoryManager->addMemory($content, $type, $importance);
    echo json_encode(['memory' => $memory]);
}

function handleUpdateMemory($memoryManager) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? '';
    $updates = $input['updates'] ?? [];
    
    if (!$id) {
        throw new Exception('Memory ID required');
    }
    
    $memoryManager->updateMemory($id, $updates);
    echo json_encode(['success' => true]);
}

function handleDeleteMemory($memoryManager) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? '';
    
    if (!$id) {
        throw new Exception('Memory ID required');
    }
    
    $memoryManager->deleteMemory($id);
    echo json_encode(['success' => true]);
}

function handleSearchMemories($memoryManager) {
    $query = $_GET['q'] ?? '';
    
    if (!$query) {
        echo json_encode(['memories' => []]);
        return;
    }
    
    $memories = $memoryManager->searchMemories($query);
    echo json_encode(['memories' => $memories]);
}

function handleGetSettings($storage) {
    $settings = $storage->getUserSettings();
    echo json_encode(['settings' => $settings]);
}

function handleSaveSettings($storage) {
    $input = json_decode(file_get_contents('php://input'), true);
    $storage->saveUserSettings($input);
    echo json_encode(['success' => true]);
}

function handleGetAIConfig($storage) {
    $config = $storage->getAIConfig();
    echo json_encode(['config' => $config]);
}

function handleSaveAIConfig($storage) {
    $input = json_decode(file_get_contents('php://input'), true);
    $storage->saveAIConfig($input);
    echo json_encode(['success' => true]);
}

function handleUploadImage() {
    if (!isset($_FILES['image'])) {
        throw new Exception('No image uploaded');
    }
    
    $file = $_FILES['image'];
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!in_array($file['type'], $allowedTypes)) {
        throw new Exception('Invalid file type');
    }
    
    $filename = uniqid() . '_' . basename($file['name']);
    $filepath = UPLOAD_PATH . $filename;
    
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception('Failed to upload image');
    }
    
    $url = '/assets/images/uploads/' . $filename;
    echo json_encode(['url' => $url]);
}

function handleExportData($storage, $memoryManager) {
    $data = [
        'exported_at' => date('c'),
        'chats' => $storage->getChats(),
        'memories' => $memoryManager->getMemories(),
        'settings' => $storage->getUserSettings(),
        'ai_config' => $storage->getAIConfig()
    ];
    
    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="ai_chat_export_' . date('Y-m-d') . '.json"');
    echo json_encode($data, JSON_PRETTY_PRINT);
}

function handleImportData($storage, $memoryManager) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (isset($input['chats'])) {
        foreach ($input['chats'] as $chat) {
            $storage->saveChat($chat['id'], $chat);
        }
        $storage->saveChatIndex($input['chats']);
    }
    
    if (isset($input['memories'])) {
        $memoryManager->importMemories(json_encode($input['memories']));
    }
    
    if (isset($input['settings'])) {
        $storage->saveUserSettings($input['settings']);
    }
    
    if (isset($input['ai_config'])) {
        $storage->saveAIConfig($input['ai_config']);
    }
    
    echo json_encode(['success' => true]);
}
