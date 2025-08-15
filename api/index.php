<?php
// --- Konfiguration ---
$db_host = 'mariadb106';
$db_name = 'db486219_24';
$db_user = 'db486219_24';
$db_pass = 'G()odfell@$1';
$db_charset = 'utf8mb4';
$secret_key = 'Z@xR9!c$vB&n M*kLp2s5v8y/B?E(H+KbPeShVmYq3t6w9z$C&F)J@NcQfTjWnZr4u7x!A%D*G-KaPdSgUkXp2s5v8y/B?E(H+KbPeShVmYq3t6w9z$C&F)J@NcQfTjWn';

// --- Header ---
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { exit; }

// --- Datenbankverbindung ---
$dsn = "mysql:host=$db_host;dbname=$db_name;charset=$db_charset";
$options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC];
try {
     $pdo = new PDO($dsn, $db_user, $db_pass, $options);
} catch (\PDOException $e) {
     http_response_code(500);
     echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
     exit;
}

// --- API-Logik ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // --- DATEN SPEICHERN ---
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['secret_key']) || $data['secret_key'] !== $secret_key) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Invalid secret key.']);
        exit;
    }
    $sql = "INSERT INTO articles (title, slug, summary, body_html, category, image_path, published_at) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $stmt= $pdo->prepare($sql);
    try {
        $stmt->execute([$data['title'], $data['slug'], $data['summary'], $data['body_html'], $data['category'], $data['image_path'], $data['published_at']]);
        echo json_encode(['success' => true, 'message' => 'Article published successfully!']);
    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to publish article: ' . $e->getMessage()]);
    }
} else {
    // --- DATEN ABRUFEN (GET-Anfragen) ---
    $action = $_GET['get'] ?? '';
    switch ($action) {
        case 'articles':
            $stmt = $pdo->query('SELECT * FROM articles ORDER BY published_at DESC');
            $response_data = $stmt->fetchAll();
            break;
        case 'article':
            $slug = $_GET['slug'] ?? '';
            if ($slug) {
                $stmt = $pdo->prepare('SELECT * FROM articles WHERE slug = ?');
                $stmt->execute([$slug]);
                $response_data = $stmt->fetch();
            } else {
                $response_data = ['error' => 'No slug provided'];
                http_response_code(400);
            }
            break;
        case 'assets':
            $stmt = $pdo->query('SELECT a.*, c.name as category_name FROM assets a LEFT JOIN categories c ON a.category_id = c.id ORDER BY a.created_at DESC');
            $response_data = $stmt->fetchAll();
            break;
        default:
            $response_data = ['error' => 'Invalid GET action.'];
            http_response_code(400);
            break;
    }
    echo json_encode($response_data);
}
?>
