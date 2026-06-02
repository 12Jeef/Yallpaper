import Foundation
import Network

final class SimpleHTTPServer {

    private let listener: NWListener
    private let rootURL: URL

    init(port: UInt16 = 2345, rootURL: URL) throws {
        self.rootURL = rootURL

        let params = NWParameters.tcp
        listener = try NWListener(
            using: params,
            on: NWEndpoint.Port(rawValue: port)!
        )
    }

    func start() {
        listener.newConnectionHandler = { [weak self] conn in
            self?.handle(conn)
        }

        listener.start(queue: .global())
        print("http://127.0.0.1:2345")
    }

    private func handle(_ conn: NWConnection) {
        conn.start(queue: .global())

        conn.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] data, _, isComplete, _ in

            guard let self, let data else {
                conn.cancel()
                return
            }

            let request = String(decoding: data, as: UTF8.self)

            let path = self.parsePath(request)
            let fileURL = self.rootURL.appendingPathComponent(path)

            let fileData = (try? Data(contentsOf: fileURL)) ?? Data("404".utf8)
            let mime = self.mime(for: fileURL.path)

            let response = self.buildResponse(
                body: fileData,
                mime: mime
            )

            conn.send(content: response, completion: .contentProcessed { _ in
                conn.cancel()
            })
        }
    }

    // MARK: - HTTP response builder (IMPORTANT PART)

    private func buildResponse(body: Data, mime: String) -> Data {

        let header =
        "HTTP/1.1 200 OK\r\n" +
        "Content-Type: \(mime)\r\n" +
        "Content-Length: \(body.count)\r\n" +
        "Connection: close\r\n" +
        "\r\n"

        var data = Data(header.utf8)
        data.append(body)
        return data
    }

    private func parsePath(_ request: String) -> String {
        guard let line = request.split(separator: "\r\n").first else {
            return "index.html"
        }

        let parts = line.split(separator: " ")
        guard parts.count > 1 else { return "index.html" }

        let raw = String(parts[1])
        return raw == "/" ? "index.html" : String(raw.dropFirst())
    }

    private func mime(for path: String) -> String {
        if path.hasSuffix(".html") { return "text/html" }
        if path.hasSuffix(".js") { return "text/javascript" }
        if path.hasSuffix(".css") { return "text/css" }
        return "application/octet-stream"
    }
}
