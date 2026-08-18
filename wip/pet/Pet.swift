import AppKit

final class PetView: NSView {
    enum State: String { case work = "WORK", waiting = "WAITING", success = "SUCCESS", failed = "FAILED", close = "CLOSE" }
    private let atlas: NSImage
    private let label: String
    private var state = State.work
    private var frameIndex = 0
    private var direction: CGFloat = Bool.random() ? 1 : -1
    private var velocity: CGFloat = 2
    private var dragged = false
    private var pauseUntil = Date.distantPast
    private var beepTimer: Timer?
    private var dragOrigin: NSPoint?
    private let columns = 8
    private let rows = 11

    init(frame: NSRect, spritesheetPath: String, label: String) {
        guard let image = NSImage(contentsOfFile: spritesheetPath) else { fatalError("Could not load pet spritesheet") }
        atlas = image
        self.label = label
        super.init(frame: frame)
        Timer.scheduledTimer(withTimeInterval: 1 / 12, repeats: true) { [weak self] _ in self?.tick() }
    }
    required init?(coder: NSCoder) { nil }

    func transition(_ next: State) {
        state = next
        frameIndex = 0
        beepTimer?.invalidate()
        if next == .waiting {
            NSSound.beep()
            beepTimer = Timer.scheduledTimer(withTimeInterval: 4, repeats: true) { _ in NSSound.beep() }
        }
        needsDisplay = true
    }

    private var row: Int {
        switch state {
        case .work: return direction >= 0 ? 1 : 2
        case .waiting: return 6
        case .success: return 3
        case .failed: return 5
        case .close: return 0
        }
    }

    private func tick() {
        frameIndex = (frameIndex + 1) % columns
        guard state == .work, !dragged, Date() >= pauseUntil, let window = window, let screen = window.screen ?? NSScreen.main else { needsDisplay = true; return }
        let visible = screen.visibleFrame
        var point = window.frame.origin
        point.x += velocity * direction
        if point.x < visible.minX || point.x + window.frame.width > visible.maxX {
            direction *= -1
            point.x = min(max(point.x, visible.minX), visible.maxX - window.frame.width)
        }
        window.setFrameOrigin(point)
        needsDisplay = true
    }

    override func draw(_ dirtyRect: NSRect) {
        let imageSize = atlas.size
        let cell = NSSize(width: imageSize.width / CGFloat(columns), height: imageSize.height / CGFloat(rows))
        let source = NSRect(x: CGFloat(frameIndex) * cell.width, y: imageSize.height - CGFloat(row + 1) * cell.height, width: cell.width, height: cell.height)
        atlas.draw(in: bounds, from: source, operation: .sourceOver, fraction: 1, respectFlipped: true, hints: [.interpolation: NSImageInterpolation.high])
        if state == .waiting {
            let bubble = NSBezierPath(roundedRect: NSRect(x: 4, y: bounds.height - 48, width: bounds.width - 8, height: 44), xRadius: 13, yRadius: 13)
            NSColor.systemRed.setFill(); bubble.fill()
            let style = NSMutableParagraphStyle(); style.alignment = .center; style.lineBreakMode = .byTruncatingTail
            "HEY\n\(label)".draw(in: NSRect(x: 8, y: bounds.height - 44, width: bounds.width - 16, height: 36), withAttributes: [.font: NSFont.boldSystemFont(ofSize: 11), .foregroundColor: NSColor.white, .paragraphStyle: style])
        }
    }

    override func mouseDown(with event: NSEvent) { dragged = true; dragOrigin = event.locationInWindow; transition(.success) }
    override func mouseDragged(with event: NSEvent) {
        guard let window, let dragOrigin else { return }
        let delta = NSPoint(x: event.locationInWindow.x - dragOrigin.x, y: event.locationInWindow.y - dragOrigin.y)
        window.setFrameOrigin(NSPoint(x: window.frame.origin.x + delta.x, y: window.frame.origin.y + delta.y))
    }
    override func mouseUp(with event: NSEvent) { dragged = false; pauseUntil = Date().addingTimeInterval(2); transition(.work) }
}

let args = CommandLine.arguments
func argument(_ name: String) -> String? { guard let index = args.firstIndex(of: name), args.indices.contains(index + 1) else { return nil }; return args[index + 1] }
guard let spritesheetPath = argument("--spritesheet") else { fatalError("--spritesheet is required") }
let label = argument("--label") ?? "Pi session"
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let size = NSSize(width: 180, height: 220)
let visible = (NSScreen.screens.randomElement()?.visibleFrame) ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
let origin = NSPoint(
    x: CGFloat.random(in: visible.minX...max(visible.minX, visible.maxX - size.width)),
    y: CGFloat.random(in: visible.minY...max(visible.minY, visible.maxY - size.height))
)
let window = NSWindow(contentRect: NSRect(origin: origin, size: size), styleMask: .borderless, backing: .buffered, defer: false)
window.isOpaque = false; window.backgroundColor = .clear; window.hasShadow = false; window.level = .floating
window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
let pet = PetView(frame: NSRect(origin: .zero, size: size), spritesheetPath: spritesheetPath, label: label)
window.contentView = pet; window.orderFrontRegardless()
FileHandle.standardInput.readabilityHandler = { handle in
    let input = String(data: handle.availableData, encoding: .utf8) ?? ""
    for command in input.split(whereSeparator: \.isNewline) { DispatchQueue.main.async {
        if command == "CLOSE" { app.terminate(nil) }
        else if command == "HIDE" { window.orderOut(nil) }
        else if let next = PetView.State(rawValue: String(command)) { pet.transition(next); window.orderFrontRegardless() }
    }}
}
app.run()
