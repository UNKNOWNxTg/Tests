<?php
/**
 * Premium AI Chat Application - Configuration
 */

// Database Configuration (optional - uses JSON storage by default)
define('USE_DATABASE', false);
define('DB_HOST', 'localhost');
define('DB_NAME', 'ai_chat');
define('DB_USER', 'root');
define('DB_PASS', '');

// Application Settings
define('APP_NAME', 'AI Companion');
define('APP_VERSION', '1.0.0');
define('APP_SECRET', 'change_this_secret_key_in_production');

// Storage Paths
define('DATA_PATH', __DIR__ . '/data/');
define('BACKUP_PATH', __DIR__ . '/data/backups/');
define('UPLOAD_PATH', __DIR__ . '/assets/images/uploads/');

// API Defaults
define('DEFAULT_PROVIDER', 'openrouter');
define('DEFAULT_MODEL', 'anthropic/claude-3.5-sonnet');
define('DEFAULT_TEMPERATURE', 0.7);
define('DEFAULT_MAX_TOKENS', 2048);
define('DEFAULT_CONTEXT_LENGTH', 4096);

// Memory Settings
define('MEMORY_ENABLED', true);
define('MAX_MEMORIES', 100);
define('MEMORY_IMPORTANCE_THRESHOLD', 0.5);

// Session Settings
define('SESSION_LIFETIME', 3600 * 24); // 24 hours

// Admin Credentials (change these!)
define('ADMIN_USERNAME', 'admin');
define('ADMIN_PASSWORD_HASH', password_hash('admin123', PASSWORD_DEFAULT));

// Create necessary directories
$directories = [
    DATA_PATH,
    BACKUP_PATH,
    UPLOAD_PATH,
    DATA_PATH . 'chats/',
    DATA_PATH . 'memories/',
    DATA_PATH . 'users/',
    DATA_PATH . 'backups/',
    DATA_PATH . 'logs/'
];

foreach ($directories as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// Initialize session
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_strict_mode', 1);
    session_start();
}

// Timezone
date_default_timezone_set('UTC');

// Error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', DATA_PATH . 'logs/error.log');
