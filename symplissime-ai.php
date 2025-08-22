<?php
session_start();

// Configuration Symplissime AI
$BASE_URL = 'http://storage.symplissime.fr:3002';
$API_KEY = 'DV90GFR-8YR4RW2-G9BMCQ9-9X96PW5';
$DEFAULT_WORKSPACE = 'support-windows';
$CURRENT_USER = 'symplissime-backoffice';

// Set timezone to UTC
date_default_timezone_set('UTC');

// Handle chat requests
if (isset($_POST['action']) && $_POST['action'] === 'chat') {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST');
    header('Access-Control-Allow-Headers: Content-Type');
    
    $message = $_POST['message'] ?? '';
    $workspaceSlug = $_POST['workspace'] ?? $DEFAULT_WORKSPACE;
    $sessionId = $_SESSION['chat_session_id'] ?? uniqid('session_');
    
    $_SESSION['chat_session_id'] = $sessionId;
    
    // Validation des données
    if (empty($message)) {
        echo json_encode(['error' => 'Message vide']);
        exit;
    }
    
    $url = "$BASE_URL/api/v1/workspace/$workspaceSlug/chat";
    
    $postData = [
        'message' => trim($message),
        'mode' => 'chat',
        'sessionId' => $sessionId
    ];
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $API_KEY,
        'Accept: application/json'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        echo json_encode(['error' => 'Erreur de connexion: ' . $error]);
        exit;
    }
    
    if ($httpCode !== 200) {
        echo json_encode(['error' => "Erreur serveur: HTTP $httpCode"]);
        exit;
    }
    
    $responseData = json_decode($response, true);
    
    if ($responseData && json_last_error() === JSON_ERROR_NONE) {
        $assistantMessage = 
            $responseData['textResponse'] ?? 
            $responseData['response'] ?? 
            $responseData['message'] ?? 
            'Aucune réponse reçue';
        
        echo json_encode([
            'success' => true,
            'message' => $assistantMessage,
            'sessionId' => $sessionId
        ]);
    } else {
        echo json_encode(['error' => 'Format de réponse invalide']);
    }
    exit;
}

// Si pas de requête AJAX, afficher la page HTML
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Symplissime AI - Assistant Support Windows</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="symplissime-ai.css">
</head>
<body>
    <!-- Symplissime Branding -->
    <div class="symplissime-branding">
        <div class="symplissime-logo">S</div>
        <span class="symplissime-text">Symplissime AI</span>
    </div>

    <!-- Controls Panel -->
    <div class="controls-panel">
        <button class="control-btn" onclick="symplissimeApp.decreaseFontSize()" title="Réduire le texte">A-</button>
        <button class="control-btn" onclick="symplissimeApp.increaseFontSize()" title="Agrandir le texte">A+</button>
        <button class="control-btn" onclick="symplissimeApp.toggleTheme()" title="Changer de thème" id="themeToggle">🌿</button>
        <button class="control-btn" onclick="symplissimeApp.exportHistory()" title="Exporter historique">📥</button>
        <button class="control-btn" onclick="symplissimeApp.clearHistory()" title="Vider historique">🗑️</button>
    </div>
    
    <div class="main-container">
        <div class="chat-container" id="chatContainer">
            <div class="chat-header">
                <div class="header-left">
                    <div class="logo">AI</div>
                    <div class="header-info">
                        <h1>Symplissime AI</h1>
                        <div class="subtitle">
                            <span>👤 Utilisateur : <?php echo htmlspecialchars($CURRENT_USER); ?></span>
                            <span>🖥️ Support Windows & IT</span>
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <div class="datetime" id="datetime"><?php echo gmdate('Y-m-d H:i:s'); ?></div>
                    <div class="status-badge">
                        <div class="status-dot" id="statusDot"></div>
                        <span id="statusText">Connexion...</span>
                    </div>
                </div>
                <div class="powered-by">
                    <span>powered by</span>
                    <div class="mini-logo">S</div>
                    <span>Symplissime</span>
                </div>
            </div>
            
            <div class="chat-messages" id="chatMessages"></div>
            
            <div class="chat-input-container">
                <form class="input-form" id="chatForm">
                    <input 
                        type="text" 
                        class="message-input" 
                        id="messageInput" 
                        placeholder="Posez votre question sur Windows, le support IT ou demandez de l'aide..."
                        autocomplete="off"
                        required
                        maxlength="1000"
                    >
                    <button type="submit" class="send-button" id="sendButton">
                        <span>Envoyer</span>
                    </button>
                </form>
            </div>
        </div>
    </div>
    
    <div class="toast" id="toast"></div>

    <!-- Configuration JavaScript -->
    <script>
        window.SYMPLISSIME_CONFIG = {
            WORKSPACE: '<?php echo $DEFAULT_WORKSPACE; ?>',
            USER: '<?php echo htmlspecialchars($CURRENT_USER); ?>',
            API_ENDPOINT: '<?php echo $_SERVER['PHP_SELF']; ?>'
        };
    </script>
    
    <script src="symplissime-ai.js"></script>
</body>
</html>