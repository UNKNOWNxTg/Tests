<?php
/**
 * Memory Manager - Advanced memory system for AI context
 */

class MemoryManager {
    private $storage;
    
    public function __construct() {
        $this->storage = StorageManager::getInstance();
    }
    
    /**
     * Get all memories
     */
    public function getMemories() {
        return $this->storage->getMemories();
    }
    
    /**
     * Add a new memory
     */
    public function addMemory($content, $type = 'general', $importance = 0.5) {
        $memories = $this->getMemories();
        
        $memory = [
            'id' => $this->generateId(),
            'content' => $content,
            'type' => $type,
            'importance' => $importance,
            'created_at' => time(),
            'updated_at' => time(),
            'access_count' => 0,
            'tags' => $this->extractTags($content)
        ];
        
        $memories[] = $memory;
        
        // Limit memories
        if (count($memories) > MAX_MEMORIES) {
            $memories = $this->pruneMemories($memories);
        }
        
        $this->storage->saveMemories($memories);
        
        return $memory;
    }
    
    /**
     * Update a memory
     */
    public function updateMemory($id, $updates) {
        $memories = $this->getMemories();
        
        foreach ($memories as &$memory) {
            if ($memory['id'] === $id) {
                $memory = array_merge($memory, $updates);
                $memory['updated_at'] = time();
                break;
            }
        }
        
        $this->storage->saveMemories($memories);
    }
    
    /**
     * Delete a memory
     */
    public function deleteMemory($id) {
        $memories = $this->getMemories();
        $memories = array_filter($memories, function($m) use ($id) {
            return $m['id'] !== $id;
        });
        $this->storage->saveMemories(array_values($memories));
    }
    
    /**
     * Search memories
     */
    public function searchMemories($query) {
        $memories = $this->getMemories();
        $query = strtolower($query);
        
        return array_values(array_filter($memories, function($m) use ($query) {
            return strpos(strtolower($m['content']), $query) !== false ||
                   strpos(strtolower(implode(' ', $m['tags'])), $query) !== false;
        }));
    }
    
    /**
     * Get memories by type
     */
    public function getMemoriesByType($type) {
        $memories = $this->getMemories();
        return array_values(array_filter($memories, function($m) use ($type) {
            return $m['type'] === $type;
        }));
    }
    
    /**
     * Get relevant memories for context
     */
    public function getRelevantMemories($limit = 10) {
        $memories = $this->getMemories();
        
        // Sort by importance and access count
        usort($memories, function($a, $b) {
            $scoreA = $a['importance'] * 0.7 + min($a['access_count'] / 10, 0.3);
            $scoreB = $b['importance'] * 0.7 + min($b['access_count'] / 10, 0.3);
            return $scoreB <=> $scoreA;
        });
        
        return array_slice(array_values($memories), 0, $limit);
    }
    
    /**
     * Extract memories from conversation
     */
    public function extractMemories($messages, $aiConfig) {
        $newMemories = [];
        $lastMessage = end($messages);
        
        // Look for important information patterns
        $patterns = [
            '/I (?:am|\'m) ([^.]+)/i' => 'personal',
            '/My name is ([^.]+)/i' => 'personal',
            '/I like ([^.]+)/i' => 'preference',
            '/I love ([^.]+)/i' => 'preference',
            '/I hate ([^.]+)/i' => 'preference',
            '/I prefer ([^.]+)/i' => 'preference',
            '/Remember that ([^.]+)/i' => 'important',
            '/(?:always|never) ([^.]+)/i' => 'preference'
        ];
        
        foreach ($messages as $msg) {
            if ($msg['role'] !== 'user') continue;
            
            foreach ($patterns as $pattern => $type) {
                if (preg_match($pattern, $msg['content'], $matches)) {
                    $content = trim($matches[1]);
                    
                    // Check if similar memory exists
                    if (!$this->memoryExists($content)) {
                        $importance = $this->calculateImportance($content, $type);
                        
                        if ($importance >= MEMORY_IMPORTANCE_THRESHOLD) {
                            $newMemories[] = $this->addMemory($content, $type, $importance);
                        }
                    }
                }
            }
        }
        
        return $newMemories;
    }
    
    /**
     * Calculate memory importance
     */
    private function calculateImportance($content, $type) {
        $base = 0.5;
        
        switch ($type) {
            case 'important':
                $base = 0.9;
                break;
            case 'personal':
                $base = 0.8;
                break;
            case 'preference':
                $base = 0.6;
                break;
        }
        
        // Boost for longer, more detailed content
        $wordCount = str_word_count($content);
        if ($wordCount > 10) {
            $base += 0.1;
        }
        
        return min($base, 1.0);
    }
    
    /**
     * Check if memory already exists
     */
    private function memoryExists($content) {
        $memories = $this->getMemories();
        $content = strtolower(trim($content));
        
        foreach ($memories as $memory) {
            $existing = strtolower(trim($memory['content']));
            similar_text($content, $existing, $percent);
            if ($percent > 80) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Prune old/less important memories
     */
    private function pruneMemories($memories) {
        // Sort by importance
        usort($memories, function($a, $b) {
            return $b['importance'] <=> $a['importance'];
        });
        
        return array_slice($memories, 0, MAX_MEMORIES);
    }
    
    /**
     * Extract tags from content
     */
    private function extractTags($content) {
        $words = preg_split('/\s+/', $content);
        $stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'about', 'against', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their'];
        
        $tags = [];
        foreach ($words as $word) {
            $word = strtolower(preg_replace('/[^a-z]/i', '', $word));
            if (strlen($word) > 3 && !in_array($word, $stopWords)) {
                $tags[] = $word;
            }
        }
        
        return array_unique(array_slice($tags, 0, 5));
    }
    
    /**
     * Generate unique ID
     */
    private function generateId() {
        return 'mem_' . uniqid() . '_' . time();
    }
    
    /**
     * Export memories
     */
    public function exportMemories() {
        return json_encode($this->getMemories(), JSON_PRETTY_PRINT);
    }
    
    /**
     * Import memories
     */
    public function importMemories($json) {
        $imported = json_decode($json, true);
        if (!is_array($imported)) {
            return false;
        }
        
        $memories = $this->getMemories();
        
        foreach ($imported as $memory) {
            if (!isset($memory['id'])) {
                $memory['id'] = $this->generateId();
            }
            $memories[] = $memory;
        }
        
        $this->storage->saveMemories($memories);
        return true;
    }
    
    /**
     * Clear all memories
     */
    public function clearMemories() {
        $this->storage->saveMemories([]);
    }
}
