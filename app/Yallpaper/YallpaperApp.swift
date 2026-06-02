import Cocoa
import WebKit

@main
class Yallpaper {

    static func main() {
        let app = NSApplication.shared

        let delegate = AppDelegate()
        app.delegate = delegate

        app.run()
    }
}

class AppDelegate: NSObject, NSApplicationDelegate {

    var window: NSWindow!
    var webView: WKWebView!
    var server: SimpleHTTPServer!

    func applicationDidFinishLaunching(_ notification: Notification) {

        guard let screen = NSScreen.main else {
            NSApp.terminate(nil)
            return
        }

        window = NSWindow(
            contentRect: screen.frame,
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )

        window.ignoresMouseEvents = true

        window.collectionBehavior = [
            .canJoinAllSpaces,
            .stationary
        ]

        window.level = NSWindow.Level(
            rawValue: Int(CGWindowLevelForKey(.desktopWindow))
        )
        
        let resourceURL = Bundle.main.resourceURL!
        server = try! SimpleHTTPServer(
            port: 2345,
            rootURL: resourceURL
        )
        server.start()
        
        webView = WKWebView(frame: screen.frame)
        let url = URL(string: "http://127.0.0.1:2345/index.html")!
        webView.load(URLRequest(url: url))

        window.contentView = webView;
        window.makeKeyAndOrderFront(nil)

        NSApp.activate(ignoringOtherApps: false)
    }
}
