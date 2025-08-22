<?php
session_start();

// Configuration RGPD
$BASE_URL = 'http://storage.symplissime.fr:3002';
$API_KEY = 'DV90GFR-8YR4RW2-G9BMCQ9-9X96PW5';
$DEFAULT_WORKSPACE = 'expert-rgpd';
$CURRENT_USER = 'Consultant';
$APP_VERSION = '3.1';

// Set timezone to UTC
date_default_timezone_set('UTC');

// Handle chat requests
if (isset($_POST['action']) && $_POST['action'] === 'chat') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST');
    header('Access-Control-Allow-Headers: Content-Type');
    
    $message = $_POST['message'] ?? '';
    $workspaceSlug = $_POST['workspace'] ?? $DEFAULT_WORKSPACE;
    $sessionId = $_SESSION['chat_session_id'] ?? uniqid('session_');
    
    $_SESSION['chat_session_id'] = $sessionId;
    
    // Validation des données
    if (empty($message)) {
        http_response_code(400);
        echo 'Message vide';
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
        http_response_code(500);
        echo 'Erreur de connexion: ' . $error;
        exit;
    }

    if ($httpCode !== 200) {
        http_response_code($httpCode);
        echo "Erreur serveur: HTTP $httpCode";
        exit;
    }
    
    $responseData = json_decode($response, true);
    
    if ($responseData && json_last_error() === JSON_ERROR_NONE) {
        $assistantMessage =
            $responseData['textResponse'] ??
            $responseData['response'] ??
            $responseData['message'] ??
            'Aucune réponse reçue';

        header('Content-Type: text/plain; charset=UTF-8');
        header('Cache-Control: no-cache');
        header('X-Accel-Buffering: no');
        @ob_end_clean();
        $length = mb_strlen($assistantMessage, 'UTF-8');
        for ($i = 0; $i < $length; $i++) {
            echo mb_substr($assistantMessage, $i, 1, 'UTF-8');
            @ob_flush();
            flush();
            usleep(1000);
        }
    } else {
        http_response_code(500);
        echo 'Format de réponse invalide';
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
    <title>Conseiller RGPD IA v<?php echo htmlspecialchars($APP_VERSION); ?> - Powered by Symplissime AI</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=Roboto:wght@300;400;500;700&family=Lato:wght@300;400;700&family=Poppins:wght@300;400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="conseiller-rgpd.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
</head>
<body>
    <!-- Symplissime Branding -->
    <div class="symplissime-branding">
        <div class="symplissime-logo">S</div>
        <span class="symplissime-text">Powered by Symplissime AI</span>
    </div>

    <!-- Controls Panel -->
    <div class="controls-panel">
        <button class="control-btn" onclick="rgpdApp.decreaseFontSize()" title="Réduire le texte">A-</button>
        <button class="control-btn" onclick="rgpdApp.increaseFontSize()" title="Agrandir le texte">A+</button>
        <button class="control-btn" onclick="rgpdApp.toggleTheme()" title="Basculer le thème" id="themeToggle">🌙</button>
        <button class="control-btn" onclick="rgpdApp.toggleThemeMenu()" title="Changer le thème de couleur" id="colorThemeToggle">🎨</button>
        <button class="control-btn" onclick="rgpdApp.toggleFontMenu()" title="Changer la police" id="fontToggle">🅰️</button>
        <button class="control-btn" onclick="rgpdApp.toggleDebug()" title="Ouvrir le debug" id="debugToggle">🐞</button>
        <div class="theme-menu hidden" id="themeMenu"></div>
        <div class="theme-menu hidden" id="fontMenu">
            <div class="theme-option" data-font="font-inter">Inter</div>
            <div class="theme-option" data-font="font-roboto">Roboto</div>
            <div class="theme-option" data-font="font-lato">Lato</div>
            <div class="theme-option" data-font="font-poppins">Poppins</div>
            <div class="theme-option" data-font="font-jetbrains">JetBrains Mono</div>
        </div>
    </div>
    
    <div class="main-container">
        <div class="chat-container" id="chatContainer">
            <div class="chat-header">
                <div class="header-left">
                    <div class="logo">R</div>
                    <div class="header-info">
                        <h1>Conseiller RGPD IA <span class="version-badge">v<?php echo htmlspecialchars($APP_VERSION); ?></span></h1>
                        <div class="subtitle">
                            <span>👤 Utilisateur : <?php echo htmlspecialchars($CURRENT_USER); ?></span>
                            <span>🛡️ Expert en protection des données</span>
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
                    <span>Symplissime AI</span>
                </div>
            </div>
            
            <div class="chat-messages" id="chatMessages"></div>
            
            <div class="chat-input-container">
                <form class="input-form" id="chatForm">
                    <input 
                        type="text" 
                        class="message-input" 
                        id="messageInput" 
                        placeholder="Posez votre question sur le RGPD, la protection des données..."
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
    <div class="debug-panel hidden" id="debugPanel">
        <div class="debug-header">
            <span>Debug</span>
            <button class="debug-close" id="debugClose">&times;</button>
        </div>
        <div class="debug-info" id="debugInfo"></div>
        <div class="debug-content" id="debugContent"></div>
    </div>

    <!-- Configuration JavaScript -->
    <script>
        window.RGPD_CONFIG = {
            WORKSPACE: '<?php echo $DEFAULT_WORKSPACE; ?>',
            USER: '<?php echo htmlspecialchars($CURRENT_USER); ?>',
            API_ENDPOINT: '<?php echo $_SERVER['PHP_SELF']; ?>',
            VERSION: '<?php echo $APP_VERSION; ?>'
        };
    </script>
      <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/typogr@0.6.7/typogr.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
      <script src="themes.js"></script>
      <script src="conseiller-rgpd.js"></script>
  </body>
</html>