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
    var statusItem: NSStatusItem!

    func applicationDidFinishLaunching(_ notification: Notification) {

        setupMenuBar()

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

    // MARK: - Menu Bar

    func setupMenuBar() {

        statusItem = NSStatusBar.system.statusItem(
            withLength: NSStatusItem.variableLength
        )

        if let button = statusItem.button,
           let image = NSImage(named: "StatusIcon") {

            image.isTemplate = true
            image.size = NSSize(width: 14, height: 14)

            button.image = image
        }

        let menu = NSMenu()

        let refreshItem = NSMenuItem(
            title: "Refresh Static Wallpaper",
            action: #selector(refreshWallpaper),
            keyEquivalent: ""
        )
        refreshItem.target = self
        menu.addItem(refreshItem)

        let openImageItem = NSMenuItem(
            title: "Open Wallpaper File",
            action: #selector(openWallpaperFile),
            keyEquivalent: ""
        )
        openImageItem.target = self
        menu.addItem(openImageItem)

        let revealFolderItem = NSMenuItem(
            title: "Reveal Wallpaper Folder",
            action: #selector(revealWallpaperFolder),
            keyEquivalent: ""
        )
        revealFolderItem.target = self
        menu.addItem(revealFolderItem)

        let reloadItem = NSMenuItem(
            title: "Reload Web View",
            action: #selector(reloadWebView),
            keyEquivalent: ""
        )
        reloadItem.target = self
        menu.addItem(reloadItem)

        menu.addItem(.separator())

        let quitItem = NSMenuItem(
            title: "Quit Yallpaper",
            action: #selector(quitApp),
            keyEquivalent: ""
        )
        quitItem.target = self
        menu.addItem(quitItem)

        statusItem.menu = menu
    }

    @objc func refreshWallpaper() {
        captureWallpaper()
    }

    @objc func reloadWebView() {
        webView.reload()
    }

    @objc func openWallpaperFile() {

        do {
            let url = try wallpaperURL()
            NSWorkspace.shared.open(url)
        } catch {
            print("Failed to open wallpaper:", error)
        }
    }

    @objc func revealWallpaperFolder() {

        do {
            let url = try wallpaperURL()
            NSWorkspace.shared.activateFileViewerSelecting([url])
        } catch {
            print("Failed to reveal wallpaper:", error)
        }
    }

    @objc func quitApp() {
        NSApp.terminate(nil)
    }

    // MARK: - WebView

    func webView(
        _ webView: WKWebView,
        didFinish navigation: WKNavigation!
    ) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.captureWallpaper()
        }
    }

    // MARK: - Wallpaper Capture

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

    // MARK: - Wallpaper Storage

    private func wallpaperURL() throws -> URL {

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

        return folder.appendingPathComponent("wallpaper.png")
    }

    private func saveSnapshot(_ image: NSImage) throws -> URL {

        let fileURL = try wallpaperURL()

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
