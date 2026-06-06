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

class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {

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
        webView.navigationDelegate = self

        let url = URL(string: "http://127.0.0.1:2345/index.html")!
        webView.load(URLRequest(url: url))

        window.contentView = webView
        window.makeKeyAndOrderFront(nil)

        NSApp.activate(ignoringOtherApps: false)
    }

    // Called when index.html finishes loading
    func webView(
        _ webView: WKWebView,
        didFinish navigation: WKNavigation!
    ) {
        // Give JS/WebGPU a moment to render.
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.captureWallpaper()
        }
    }

    private func captureWallpaper() {

        let config = WKSnapshotConfiguration()

        webView.takeSnapshot(with: config) { image, error in

            guard let image else {
                print("Snapshot failed:", error ?? "unknown error")
                return
            }

            do {

                let wallpaperURL = try self.saveSnapshot(image)

                for screen in NSScreen.screens {
                    try NSWorkspace.shared.setDesktopImageURL(
                        wallpaperURL,
                        for: screen
                    )
                }

                print("Wallpaper updated:", wallpaperURL.path)

            } catch {
                print("Wallpaper save/set failed:", error)
            }
        }
    }

    private func saveSnapshot(_ image: NSImage) throws -> URL {

        let appSupport =
            FileManager.default.urls(
                for: .applicationSupportDirectory,
                in: .userDomainMask
            ).first!

        let folder =
            appSupport.appendingPathComponent(
                "Yallpaper",
                isDirectory: true
            )

        try FileManager.default.createDirectory(
            at: folder,
            withIntermediateDirectories: true
        )

        let fileURL =
            folder.appendingPathComponent(
                "wallpaper.png"
            )

        guard
            let tiff = image.tiffRepresentation,
            let bitmap = NSBitmapImageRep(data: tiff),
            let png = bitmap.representation(
                using: .png,
                properties: [:]
            )
        else {
            throw NSError(
                domain: "Yallpaper",
                code: 1,
                userInfo: [
                    NSLocalizedDescriptionKey:
                        "Failed to create PNG"
                ]
            )
        }

        try png.write(to: fileURL)

        return fileURL
    }
}
