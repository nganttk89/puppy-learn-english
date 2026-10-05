import os
import json
import base64
from http.server import SimpleHTTPRequestHandler, HTTPServer
import mimetypes

PORT = 8000
DIRECTORY = "."

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
        
    def end_headers(self):
        # Prevent caching
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
        
    def do_POST(self):
        if self.path == '/api/save-scenes':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                json_data = json.loads(post_data.decode('utf-8'))
                with open('data/scenes.json', 'w', encoding='utf-8') as f:
                    json.dump(json_data, f, indent=4, ensure_ascii=False)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'success'}).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': str(e)}).encode('utf-8'))
                
        elif self.path == '/api/save-zones':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                json_data = json.loads(post_data.decode('utf-8'))
                with open('data/zones.json', 'w', encoding='utf-8') as f:
                    json.dump(json_data, f, indent=4, ensure_ascii=False)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'success'}).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': str(e)}).encode('utf-8'))
                
        elif self.path == '/api/save-question-sets':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                json_data = json.loads(post_data.decode('utf-8'))
                with open('data/question_sets.json', 'w', encoding='utf-8') as f:
                    json.dump(json_data, f, indent=4, ensure_ascii=False)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'success'}).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': str(e)}).encode('utf-8'))
                
        elif self.path == '/api/upload-image':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                filename = data.get('filename')
                base64_str = data.get('data')
                
                if ',' in base64_str:
                    base64_str = base64_str.split(',', 1)[1]
                
                image_data = base64.b64decode(base64_str)
                filepath = os.path.join('data', 'uploads', filename)
                
                # Auto-rename if file exists
                if os.path.exists(filepath):
                    base, ext = os.path.splitext(filename)
                    counter = 1
                    while os.path.exists(filepath):
                        filename = f"{base}_{counter}{ext}"
                        filepath = os.path.join('data', 'uploads', filename)
                        counter += 1
                os.makedirs(os.path.dirname(filepath), exist_ok=True)
                with open(filepath, 'wb') as f:
                    f.write(image_data)
                    
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                
                # Trả về link tương đối để client sử dụng
                url_path = f"data/uploads/{filename}"
                self.wfile.write(json.dumps({'status': 'success', 'path': url_path}).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    with HTTPServer(("", PORT), Handler) as httpd:
        print(f"🚀 Backend Server is running at http://localhost:{PORT}")
        print("Press Ctrl+C to stop.")
        httpd.serve_forever()
