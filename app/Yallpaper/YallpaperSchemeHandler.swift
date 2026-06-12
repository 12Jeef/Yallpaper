import Foundation
import WebKit

final class YallpaperSchemeHandler: NSObject, WKURLSchemeHandler {

    private let rootURL: URL

    init(rootURL: URL) {
        self.rootURL = rootURL
        super.init()
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(NSError(
                domain: "Yallpaper",
                code: 1001,
                userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]
            ))
            return
        }

        let path = self.path(for: url)
        let fileURL = rootURL.appendingPathComponent(path)
        let mime = self.mime(for: fileURL.path)

        do {
            let data = try Data(contentsOf: fileURL)
            let response = HTTPURLResponse(
                url: url,
                statusCode: 200,
                httpVersion: "HTTP/1.1",
                headerFields: ["Content-Type": mime]
            )!

            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } catch {
            let body = Data("404".utf8)
            let response = HTTPURLResponse(
                url: url,
                statusCode: 404,
                httpVersion: "HTTP/1.1",
                headerFields: ["Content-Type": "text/plain"]
            )!

            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(body)
            urlSchemeTask.didFinish()
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        // no-op
    }

    private func path(for url: URL) -> String {
        var rawPath = url.path
        if rawPath.isEmpty || rawPath == "/" {
            rawPath = "/index.html"
        }

        return String(rawPath.dropFirst())
    }

    private func mime(for path: String) -> String {
        if path.hasSuffix(".html") { return "text/html" }
        if path.hasSuffix(".js") { return "text/javascript" }
        if path.hasSuffix(".css") { return "text/css" }
        if path.hasSuffix(".png") { return "image/png" }
        if path.hasSuffix(".svg") { return "image/svg+xml" }
        return "application/octet-stream"
    }
}
