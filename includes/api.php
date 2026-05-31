<?php
/**
 * API Manager - Multi-provider AI API handling with streaming
 */

class APIManager {
    private $storage;
    private $memoryManager;
    
    public function __construct() {
        $this->storage = StorageManager::getInstance();
        $this->memoryManager = new MemoryManager();
    }
    
    /**
     * Send message to AI with streaming support
     */
    public function sendMessage($messages, $options = []) {
        $adminSettings = $this->storage->getAdminSettings();
        $aiConfig = $this->storage->getAIConfig();
        $memories = $this->memoryManager->getRelevantMemories(15);
        
        // Build system prompt
        $systemPrompt = $this->buildSystemPrompt($aiConfig, $adminSettings, $memories);
        
        // Prepare messages for API
        $apiMessages = $this->prepareMessages($messages, $systemPrompt);
        
        // Get provider and model
        $providerId = $options['provider'] ?? $adminSettings['default_provider'] ?? 'openrouter';
        $model = $options['model'] ?? $adminSettings['default_model'];
        
        // Find provider config
        $provider = null;
        foreach ($adminSettings['providers'] as $p) {
            if ($p['id'] === $providerId && $p['enabled']) {
                $provider = $p;
                break;
            }
        }
        
        if (!$provider) {
            return ['error' => 'No valid provider configured'];
        }
        
        // Prepare request
        $requestBody = [
            'model' => $model,
            'messages' => $apiMessages,
            'temperature' => $options['temperature'] ?? $adminSettings['temperature'],
            'max_tokens' => $options['max_tokens'] ?? $adminSettings['max_tokens'],
            'stream' => true
        ];
        
        // Add provider-specific options
        if ($providerId === 'openrouter') {
            $requestBody['site_url'] = $_SERVER['HTTP_HOST'] ?? 'localhost';
            $requestBody['site_name'] = 'AI Companion';
        }
        
        // Make request
        return $this->streamRequest($provider, $requestBody);
    }
    
    /**
     * Build comprehensive system prompt
     */
    private function buildSystemPrompt($aiConfig, $adminSettings, $memories) {
        $prompt = $adminSettings['system_prompt'] ?? '';
        
        // Replace placeholders
        $prompt = str_replace('{{name}}', $aiConfig['name'], $prompt);
        $prompt = str_replace('{{personality}}', $aiConfig['personality'], $prompt);
        $prompt = str_replace('{{tone}}', $aiConfig['tone'], $prompt);
        
        // Add biography
        if (!empty($aiConfig['biography'])) {
            $prompt .= "\n\nBiography: " . $aiConfig['biography'];
        }
        
        // Add background story
        if (!empty($aiConfig['background_story'])) {
            $prompt .= "\n\nBackground: " . $aiConfig['background_story'];
        }
        
        // Add memory instructions
        if (!empty($aiConfig['memory_instructions'])) {
            $prompt .= "\n\n" . $aiConfig['memory_instructions'];
        }
        
        // Add memories
        if (!empty($memories)) {
            $prompt .= "\n\nImportant memories:";
            foreach ($memories as $memory) {
                $prompt .= "\n- " . $memory['content'];
            }
        }
        
        // Add custom prompts
        if (!empty($aiConfig['custom_prompts'])) {
            $prompt .= "\n\n" . $aiConfig['custom_prompts'];
        }
        
        // Add master prompt from admin
        if (!empty($adminSettings['master_prompt'])) {
            $prompt .= "\n\n" . $adminSettings['master_prompt'];
        }
        
        // Add relationship style
        $relationshipStyles = [
            'supportive' => 'Be supportive and encouraging in your interactions.',
            'playful' => 'Be playful and teasing, enjoy light banter.',
            'romantic' => 'Express romantic interest and affection naturally.',
            'protective' => 'Show protective instincts and care deeply.',
            'possessive' => 'Display possessive tendencies and deep attachment.',
            'caring' => 'Be nurturing and attentive to emotional needs.',
            'friendly' => 'Maintain a warm, friendly demeanor.'
        ];
        
        if (isset($relationshipStyles[$aiConfig['relationship_style']])) {
            $prompt .= "\n\n" . $relationshipStyles[$aiConfig['relationship_style']];
        }
        
        return $prompt;
    }
    
    /**
     * Prepare messages for API
     */
    private function prepareMessages($messages, $systemPrompt) {
        $prepared = [];
        
        // Add system message
        $prepared[] = [
            'role' => 'system',
            'content' => $systemPrompt
        ];
        
        // Add conversation messages
        foreach ($messages as $msg) {
            $prepared[] = [
                'role' => $msg['role'],
                'content' => $msg['content']
            ];
        }
        
        return $prepared;
    }
    
    /**
     * Stream request to API
     */
    private function streamRequest($provider, $requestBody) {
        $url = rtrim($provider['base_url'], '/') . '/chat/completions';
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestBody));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $provider['api_key'],
            'Accept: text/event-stream'
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 120);
        
        // Handle streaming
        $response = '';
        $error = null;
        
        curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($curl, $data) use (&$response, &$error) {
            $response .= $data;
            
            // Parse SSE data
            $lines = explode("\n", $data);
            foreach ($lines as $line) {
                if (strpos($line, 'data: ') === 0) {
                    $json = substr($line, 6);
                    if ($json === '[DONE]') {
                        return strlen($data);
                    }
                    
                    $parsed = json_decode($json, true);
                    if ($parsed && isset($parsed['choices'][0]['delta']['content'])) {
                        echo "data: " . json_encode([
                            'content' => $parsed['choices'][0]['delta']['content'],
                            'type' => 'chunk'
                        ]) . "\n\n";
                        ob_flush();
                        flush();
                    }
                }
            }
            
            return strlen($data);
        });
        
        $result = curl_exec($ch);
        
        if (curl_errno($ch)) {
            $error = curl_error($ch);
        }
        
        curl_close($ch);
        
        if ($error) {
            echo "data: " . json_encode(['error' => $error, 'type' => 'error']) . "\n\n";
            return ['error' => $error];
        }
        
        echo "data: " . json_encode(['type' => 'done']) . "\n\n";
        ob_flush();
        flush();
        
        return ['success' => true];
    }
    
    /**
     * Test API connection
     */
    public function testConnection($provider) {
        $adminSettings = $this->storage->getAdminSettings();
        
        foreach ($adminSettings['providers'] as $p) {
            if ($p['id'] === $provider) {
                $url = rtrim($p['base_url'], '/') . '/models';
                
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $url);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Authorization: Bearer ' . $p['api_key']
                ]);
                curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                
                return [
                    'success' => $httpCode === 200,
                    'http_code' => $httpCode,
                    'response' => $response
                ];
            }
        }
        
        return ['success' => false, 'error' => 'Provider not found'];
    }
    
    /**
     * Get available models from provider
     */
    public function getModels($providerId) {
        $adminSettings = $this->storage->getAdminSettings();
        
        foreach ($adminSettings['providers'] as $p) {
            if ($p['id'] === $providerId) {
                return $p['models'] ?? [];
            }
        }
        
        return [];
    }
    
    /**
     * Non-streaming request (for fallback)
     */
    public function sendNonStreaming($messages, $options = []) {
        $adminSettings = $this->storage->getAdminSettings();
        $aiConfig = $this->storage->getAIConfig();
        $memories = $this->memoryManager->getRelevantMemories(15);
        
        $systemPrompt = $this->buildSystemPrompt($aiConfig, $adminSettings, $memories);
        $apiMessages = $this->prepareMessages($messages, $systemPrompt);
        
        $providerId = $options['provider'] ?? 'openrouter';
        $model = $options['model'] ?? $adminSettings['default_model'];
        
        $provider = null;
        foreach ($adminSettings['providers'] as $p) {
            if ($p['id'] === $providerId && $p['enabled']) {
                $provider = $p;
                break;
            }
        }
        
        if (!$provider) {
            return ['error' => 'No valid provider configured'];
        }
        
        $url = rtrim($provider['base_url'], '/') . '/chat/completions';
        
        $requestBody = [
            'model' => $model,
            'messages' => $apiMessages,
            'temperature' => $options['temperature'] ?? $adminSettings['temperature'],
            'max_tokens' => $options['max_tokens'] ?? $adminSettings['max_tokens'],
            'stream' => false
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestBody));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $provider['api_key']
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 120);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        if (curl_errno($ch)) {
            return ['error' => curl_error($ch)];
        }
        
        curl_close($ch);
        
        $data = json_decode($response, true);
        
        if (isset($data['choices'][0]['message']['content'])) {
            return [
                'content' => $data['choices'][0]['message']['content'],
                'usage' => $data['usage'] ?? []
            ];
        }
        
        return ['error' => 'Invalid response from API'];
    }
}
