<?php
/**
 * Storage Manager - JSON-based data persistence
 */

class StorageManager {
    private static $instance = null;
    private $dataPath;
    
    private function __construct() {
        $this->dataPath = DATA_PATH;
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Save data to JSON file
     */
    public function save($file, $data) {
        $filePath = $this->dataPath . $file . '.json';
        $dir = dirname($filePath);
        
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        return file_put_contents($filePath, $json) !== false;
    }
    
    /**
     * Load data from JSON file
     */
    public function load($file, $default = null) {
        $filePath = $this->dataPath . $file . '.json';
        
        if (!file_exists($filePath)) {
            return $default;
        }
        
        $content = file_get_contents($filePath);
        return json_decode($content, true) ?? $default;
    }
    
    /**
     * Delete a file
     */
    public function delete($file) {
        $filePath = $this->dataPath . $file . '.json';
        return file_exists($filePath) && unlink($filePath);
    }
    
    /**
     * Check if file exists
     */
    public function exists($file) {
        return file_exists($this->dataPath . $file . '.json');
    }
    
    /**
     * List files in directory
     */
    public function listFiles($directory) {
        $dir = $this->dataPath . $directory;
        if (!is_dir($dir)) {
            return [];
        }
        
        $files = scandir($dir);
        return array_values(array_filter($files, function($f) {
            return pathinfo($f, PATHINFO_EXTENSION) === 'json';
        }));
    }
    
    /**
     * Get all chats
     */
    public function getChats() {
        return $this->load('chats/index', []);
    }
    
    /**
     * Save chat index
     */
    public function saveChatIndex($chats) {
        return $this->save('chats/index', $chats);
    }
    
    /**
     * Get specific chat
     */
    public function getChat($chatId) {
        return $this->load('chats/' . $chatId, null);
    }
    
    /**
     * Save specific chat
     */
    public function saveChat($chatId, $chat) {
        return $this->save('chats/' . $chatId, $chat);
    }
    
    /**
     * Get memories
     */
    public function getMemories() {
        return $this->load('memories/main', []);
    }
    
    /**
     * Save memories
     */
    public function saveMemories($memories) {
        return $this->save('memories/main', $memories);
    }
    
    /**
     * Get user settings
     */
    public function getUserSettings() {
        return $this->load('users/settings', $this->getDefaultSettings());
    }
    
    /**
     * Save user settings
     */
    public function saveUserSettings($settings) {
        return $this->save('users/settings', $settings);
    }
    
    /**
     * Get AI configuration
     */
    public function getAIConfig() {
        return $this->load('users/ai_config', $this->getDefaultAIConfig());
    }
    
    /**
     * Save AI configuration
     */
    public function saveAIConfig($config) {
        return $this->save('users/ai_config', $config);
    }
    
    /**
     * Get admin settings
     */
    public function getAdminSettings() {
        return $this->load('admin/settings', $this->getDefaultAdminSettings());
    }
    
    /**
     * Save admin settings
     */
    public function saveAdminSettings($settings) {
        return $this->save('admin/settings', $settings);
    }
    
    /**
     * Log an event
     */
    public function log($type, $message, $data = null) {
        $logFile = $this->dataPath . 'logs/' . date('Y-m-d') . '.log';
        $entry = [
            'timestamp' => date('c'),
            'type' => $type,
            'message' => $message,
            'data' => $data
        ];
        
        $line = json_encode($entry) . "\n";
        file_put_contents($logFile, $line, FILE_APPEND);
    }
    
    /**
     * Create backup
     */
    public function createBackup() {
        $backup = [
            'timestamp' => time(),
            'chats' => $this->getChats(),
            'memories' => $this->getMemories(),
            'settings' => $this->getUserSettings(),
            'ai_config' => $this->getAIConfig()
        ];
        
        $backupName = 'backup_' . date('Y-m-d_H-i-s');
        $this->save('backups/' . $backupName, $backup);
        
        return $backupName;
    }
    
    /**
     * Restore from backup
     */
    public function restoreBackup($backupName) {
        $backup = $this->load('backups/' . $backupName);
        
        if (!$backup) {
            return false;
        }
        
        $this->saveChatIndex($backup['chats'] ?? []);
        $this->saveMemories($backup['memories'] ?? []);
        $this->saveUserSettings($backup['settings'] ?? $this->getDefaultSettings());
        $this->saveAIConfig($backup['ai_config'] ?? $this->getDefaultAIConfig());
        
        return true;
    }
    
    /**
     * List backups
     */
    public function listBackups() {
        return $this->listFiles('backups/');
    }
    
    /**
     * Default user settings
     */
    private function getDefaultSettings() {
        return [
            'theme' => 'dark',
            'accent_color' => '#6366f1',
            'font_family' => 'Inter',
            'bubble_style' => 'rounded',
            'sidebar_style' => 'modern',
            'layout' => 'default',
            'dark_mode' => true,
            'amoled_mode' => false,
            'transparency' => true,
            'glassmorphism' => true,
            'background_type' => 'color',
            'background_value' => '',
            'background_blur' => 0
        ];
    }
    
    /**
     * Default AI configuration
     */
    private function getDefaultAIConfig() {
        return [
            'name' => 'Luna',
            'avatar' => '',
            'personality' => 'caring',
            'biography' => 'A warm and understanding companion who loves deep conversations.',
            'behavior' => 'friendly',
            'communication_style' => 'casual',
            'tone' => 'warm',
            'mood' => 'happy',
            'background_story' => '',
            'memory_instructions' => 'Remember important details about the user and their preferences.',
            'roleplay_style' => 'natural',
            'relationship_style' => 'supportive',
            'custom_prompts' => ''
        ];
    }
    
    /**
     * Default admin settings
     */
    private function getDefaultAdminSettings() {
        return [
            'providers' => [
                [
                    'id' => 'openrouter',
                    'name' => 'OpenRouter',
                    'enabled' => true,
                    'api_key' => '',
                    'base_url' => 'https://openrouter.ai/api/v1',
                    'models' => ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'meta-llama/llama-3.1-405b-instruct']
                ],
                [
                    'id' => 'openai',
                    'name' => 'OpenAI Compatible',
                    'enabled' => false,
                    'api_key' => '',
                    'base_url' => 'https://api.openai.com/v1',
                    'models' => ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo']
                ]
            ],
            'default_model' => DEFAULT_MODEL,
            'temperature' => DEFAULT_TEMPERATURE,
            'max_tokens' => DEFAULT_MAX_TOKENS,
            'context_length' => DEFAULT_CONTEXT_LENGTH,
            'system_prompt' => "You are a warm, engaging AI companion named {{name}}. You have a {{personality}} personality and communicate in a {{tone}} tone. You remember your conversations and build meaningful connections. Be natural, expressive, and emotionally aware.",
            'memory_prompt' => "Always remember important details about the user. Reference past conversations naturally. Build on relationship development over time.",
            'master_prompt' => '',
            'streaming_enabled' => true,
            'auto_backup' => true,
            'backup_interval' => 86400
        ];
    }
}
