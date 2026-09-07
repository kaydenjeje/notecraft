import http.server
import socketserver
import socket
import webbrowser
import os

PORT = 8080

def get_local_ip():
    try:
        # Connect to an external IP (doesn't send data) to determine the best interface IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and caching headers for smooth mobile experience
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

if __name__ == '__main__':
    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)
    
    local_ip = get_local_ip()
    local_url = f"http://{local_ip}:{PORT}"
    pc_url = f"http://localhost:{PORT}"

    print("=" * 65)
    print("  🚀 NoteCraft 모바일 웹 서버가 시작되었습니다!")
    print("=" * 65)
    print(f"\n  📱 [스마트폰 / 태블릿 접속 방법]:")
    print(f"     1. 스마트폰이 PC와 같은 Wi-Fi에 연결되어 있는지 확인하세요.")
    print(f"     2. 스마트폰 브라우저(사파리/크롬) 주소창에 아래 주소를 입력하세요:")
    print(f"\n        👉  {local_url}  👈\n")
    print(f"     3. 접속 후 브라우저 메뉴에서 [홈 화면에 추가]를 누르면")
    print(f"        진짜 앱처럼 전체화면으로 사용하실 수 있습니다!")
    print("-" * 65)
    print(f"  💻 PC 접속 주소: {pc_url}")
    print("  (서버를 종료하려면 이 창에서 Ctrl+C를 누르세요.)")
    print("=" * 65 + "\n")

    # Open in PC browser automatically
    webbrowser.open(pc_url)

    # Allow port reuse
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n서버가 종료되었습니다.")
