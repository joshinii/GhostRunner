//
//  ContentView.swift
//  GhostRunner
//

import AVFoundation
import Combine
import MapKit
import SwiftUI

struct ContentView: View {
    @StateObject private var race = RaceViewModel()

    var body: some View {
        TabView {
            DashboardView(race: race)
                .tabItem {
                    Label("Home", systemImage: "gauge.with.dots.needle.bottom.50percent")
                }

            LiveRaceView(race: race)
                .tabItem {
                    Label("Race", systemImage: "figure.run.circle")
                }

            HistoryView(race: race)
                .tabItem {
                    Label("History", systemImage: "chart.xyaxis.line")
                }
        }
        .tint(.gsGreen)
        .preferredColorScheme(.dark)
        .toolbarBackground(Color.gsBackground, for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
    }
}

private struct DashboardView: View {
    @ObservedObject var race: RaceViewModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    BrandLogoView()
                    hero
                    readinessGrid
                    actionPanel
                    toolPanel
                    architecturePanel
                }
                .padding(18)
            }
            .background(Color.gsBackground)
            .navigationTitle("")
            .toolbarBackground(Color.gsBackground, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Real-time ghost racing")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color.gsGreen)
                        .textCase(.uppercase)
                    Text("Race the route. Read the body. Choose the move.")
                        .font(.system(size: 30, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer()

                ZStack {
                    Circle()
                        .fill(Color.white.opacity(0.12))
                        .frame(width: 58, height: 58)
                    Image(systemName: "bolt.heart.fill")
                        .font(.system(size: 26, weight: .semibold))
                        .foregroundStyle(Color.gsGreen)
                }
            }

            HStack(spacing: 12) {
                HeroMetric(title: "Mode", value: race.mode.rawValue)
                HeroMetric(title: "Ghost", value: "+12s")
                HeroMetric(title: "Safety", value: "Bio-Guard")
            }
        }
        .padding(20)
        .background(
            LinearGradient(
                colors: [Color.gsPanel, Color.gsInk, Color.gsBlue.opacity(0.78)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.white.opacity(0.10), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }

    private var readinessGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            StatTile(label: "Readiness", value: "86", unit: "/100", icon: "checkmark.seal.fill", color: .gsGreen)
            StatTile(label: "Target pace", value: "7:35", unit: "/mi", icon: "speedometer", color: .gsOrange)
            StatTile(label: "Max HR est.", value: "188", unit: "bpm", icon: "heart.fill", color: .gsRed)
            StatTile(label: "Data quality", value: "97", unit: "%", icon: "antenna.radiowaves.left.and.right", color: .gsBlue)
        }
    }

    private var actionPanel: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "Demo Controls", icon: "play.circle.fill")
            Text("Start a simulated race to show GPS ticks, interpolated ghost position, heart-rate safety, elevation scan, and coaching feedback without needing outdoor sensor data.")
                .font(.subheadline)
                .foregroundStyle(Color.gsMuted)

            HStack(spacing: 12) {
                Button {
                    race.reset()
                    race.isRunning = true
                } label: {
                    Label("Start Demo Race", systemImage: "figure.run")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(PrimaryButtonStyle())

                Button {
                    race.reset()
                } label: {
                    Image(systemName: "arrow.counterclockwise")
                        .frame(width: 46, height: 46)
                }
                .buttonStyle(IconButtonStyle())
                .accessibilityLabel("Reset race")
            }
        }
        .panelStyle()
    }

    private var toolPanel: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "Strategy Tools", icon: "wand.and.stars")
            ToolRow(icon: "timer", title: "Predict Finish Time", subtitle: "Projects finish from current pace, route distance, and ghost progress.")
            ToolRow(icon: "heart.text.square", title: "Heart Rate Analysis", subtitle: "Classifies intensity zones and suppresses unsafe push advice.")
            ToolRow(icon: "mountain.2", title: "Upcoming Elevation Scan", subtitle: "Looks ahead on the route before recommending a surge or hold.")
            ToolRow(icon: "wind", title: "Terrain and Weather Analyst", subtitle: "Adds wind load to the tactical recommendation.")
            ToolRow(icon: "shield.lefthalf.filled", title: "Bio-Guard", subtitle: "Interrupts racing logic when heart rate crosses the safety threshold.")
        }
        .panelStyle()
    }

    private var architecturePanel: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "System Flow", icon: "point.3.connected.trianglepath.dotted")

            FlowStep(number: "1", title: "GPS and HR stream", detail: "One telemetry sample per second with elevation and cadence.")
            FlowStep(number: "2", title: "Ghost engine", detail: "Interpolates the stored route to keep the ghost smooth during gaps.")
            FlowStep(number: "3", title: "Snapshot builder", detail: "Combines pace, gap, HR, elevation ahead, and wind into one decision state.")
            FlowStep(number: "4", title: "Coaching output", detail: "Returns short tactical instructions with severity and safety override.")
        }
        .panelStyle()
    }
}

private struct LiveRaceView: View {
    @ObservedObject var race: RaceViewModel
    private let tick = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    raceMap
                    controlBar
                    metricsGrid
                    CoachingBanner(decision: race.currentDecision)
                    telemetryPanel
                }
                .padding(16)
            }
            .background(Color.gsBackground)
            .navigationTitle("Live Race")
            .toolbarBackground(Color.gsBackground, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .onReceive(tick) { _ in
                race.tick()
            }
        }
    }

    private var raceMap: some View {
        Map(position: $race.mapPosition, interactionModes: .all) {
                MapPolyline(coordinates: race.route.map(\.coordinate))
                    .stroke(Color.gsBlue.opacity(0.55), lineWidth: 5)

                MapPolyline(coordinates: race.route.prefix(max(2, race.userIndex + 1)).map(\.coordinate))
                    .stroke(Color.gsGreen, lineWidth: 6)

                Annotation("You", coordinate: race.userPoint.coordinate) {
                    RunnerMarker(color: .gsGreen, icon: "figure.run")
                }

                Annotation("Ghost", coordinate: race.ghostPoint.coordinate) {
                    RunnerMarker(color: .gsPurple, icon: "sparkles")
                }
            }
            .mapStyle(.standard(elevation: .realistic))
            .frame(height: 330)
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay(alignment: .topTrailing) {
                MapZoomControls(
                    onZoomIn: race.zoomIn,
                    onZoomOut: race.zoomOut
                )
                .padding(12)
            }
            .overlay(alignment: .bottomTrailing) {
            HStack(spacing: 8) {
                    Label(race.statusText, systemImage: race.isRunning ? "dot.radiowaves.left.and.right" : "pause.circle")
                Text("1 Hz")
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(Color.gsText)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.gsPanel.opacity(0.92))
            .overlay(
                Capsule()
                    .stroke(Color.white.opacity(0.12), lineWidth: 1)
            )
            .clipShape(Capsule())
            .padding(12)
        }
    }

    private var controlBar: some View {
        HStack(spacing: 12) {
            Button {
                race.isRunning.toggle()
            } label: {
                Label(race.isRunning ? "Pause" : "Start", systemImage: race.isRunning ? "pause.fill" : "play.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(PrimaryButtonStyle())

            Button {
                race.mode = race.mode == .running ? .cycling : .running
            } label: {
                Image(systemName: race.mode == .running ? "bicycle" : "figure.run")
                    .frame(width: 46, height: 46)
            }
            .buttonStyle(IconButtonStyle())
            .accessibilityLabel("Switch sport mode")

            Button {
                race.reset()
            } label: {
                Image(systemName: "arrow.counterclockwise")
                    .frame(width: 46, height: 46)
            }
            .buttonStyle(IconButtonStyle())
            .accessibilityLabel("Reset race")
        }
    }

    private var metricsGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            StatTile(label: "Distance", value: String(format: "%.2f", race.distanceMiles), unit: "mi", icon: "location.north.line.fill", color: .gsGreen)
            StatTile(label: "Gap", value: race.gapText, unit: "", icon: "arrow.left.and.right", color: race.gapMeters <= 0 ? .gsGreen : .gsOrange)
            StatTile(label: "Pace", value: race.paceText, unit: "/mi", icon: "stopwatch.fill", color: .gsBlue)
            StatTile(label: "Heart rate", value: "\(race.heartRate)", unit: "bpm", icon: "heart.fill", color: race.hrColor)
            StatTile(label: "Projected", value: race.finishProjection, unit: "", icon: "flag.checkered", color: .gsPurple)
            StatTile(label: "Elevation ahead", value: "\(race.elevationAhead)", unit: "ft", icon: "mountain.2.fill", color: .gsOrange)
        }
    }

    private var telemetryPanel: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "Live Snapshot", icon: "waveform.path.ecg")

            SnapshotRow(label: "Elapsed", value: race.elapsedText)
            SnapshotRow(label: "Ghost interpolation", value: "60 fps map animation from 1 Hz samples")
            SnapshotRow(label: "Packet loss handling", value: race.packetLossState)
            SnapshotRow(label: "Intensity zone", value: race.hrZone)
            SnapshotRow(label: "Active agents", value: "\(race.activeAgentCount) / 6 triggered")
            SnapshotRow(label: "Primary agent", value: race.currentDecision.tool)
            if !race.agentVotes.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Agent votes")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color.gsMuted)
                        .frame(width: 130, alignment: .leading)
                    ForEach(race.agentVotes, id: \.agentName) { vote in
                        HStack(spacing: 6) {
                            Circle()
                                .fill(vote.triggered ? vote.severity.color : Color.gsMuted.opacity(0.3))
                                .frame(width: 6, height: 6)
                            Text(vote.agentName)
                                .font(.caption2)
                                .foregroundStyle(vote.triggered ? Color.gsText : Color.gsMuted)
                            Spacer()
                            Text(vote.triggered ? String(format: "%.0f%%", vote.confidence * 100) : "—")
                                .font(.caption2.monospacedDigit())
                                .foregroundStyle(vote.triggered ? vote.severity.color : Color.gsMuted)
                        }
                    }
                }
            }
        }
        .panelStyle()
    }
}

private struct HistoryView: View {
    @ObservedObject var race: RaceViewModel
    @State private var selectedSession: PastSession? = nil

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    summary
                    ForEach(race.sessions) { session in
                        SessionCard(session: session)
                            .onTapGesture { selectedSession = session }
                    }
                    dataPipeline
                    feedbackLoop
                }
                .padding(16)
            }
            .background(Color.gsBackground)
            .navigationTitle("History")
            .toolbarBackground(Color.gsBackground, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .sheet(item: $selectedSession) { session in
                SessionDetailView(session: session)
            }
        }
    }

    private var summary: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "Analytics Summary", icon: "chart.bar.xaxis")
            HStack(spacing: 12) {
                HeroMetric(title: "Sessions", value: "\(race.sessions.count)")
                HeroMetric(title: "Avg quality", value: "96%")
                HeroMetric(title: "Advice used", value: "71%")
            }
        }
        .padding(18)
        .background(Color.gsPanel)
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(Color.white.opacity(0.10), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }

    private var dataPipeline: some View {
        let totalRaw = race.sessions.reduce(0) { $0 + $1.rawPoints }
        let totalSmoothed = race.sessions.reduce(0) { $0 + $1.smoothedPoints }
        let totalPacketLoss = race.sessions.reduce(0) { $0 + $1.packetLossEvents }
        let removed = totalRaw - totalSmoothed

        return VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "Data Pipeline", icon: "waveform.path")
            Text("GPS telemetry passes through a smoothing pipeline before analytics. Outlier points (accuracy > 50 m) are removed and gaps > 3 s are interpolated.")
                .font(.subheadline)
                .foregroundStyle(Color.gsMuted)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                PipelineTile(label: "Raw points", value: "\(totalRaw)")
                PipelineTile(label: "After smoothing", value: "\(totalSmoothed)")
                PipelineTile(label: "Outliers removed", value: "\(removed)")
                PipelineTile(label: "Packet loss events", value: "\(totalPacketLoss)")
            }
        }
        .panelStyle()
    }

    private var feedbackLoop: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "Feedback Loop", icon: "arrow.triangle.2.circlepath")
            Text("Each coaching event is stored with the race state and outcome. Post-session analytics compare whether the next 30 seconds improved pace, gap, or heart-rate recovery.")
                .font(.subheadline)
                .foregroundStyle(Color.gsMuted)
            MiniChart(values: race.feedbackValues, color: .gsGreen)
                .frame(height: 92)
            if !race.liveCoachingEvents.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Current race · \(race.liveCoachingEvents.count) events recorded")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color.gsMuted)
                    ForEach(race.liveCoachingEvents.suffix(4)) { event in
                        HStack(spacing: 8) {
                            Circle()
                                .fill(event.severity.color)
                                .frame(width: 6, height: 6)
                            Text("\(event.second / 60):\(String(format: "%02d", event.second % 60))")
                                .font(.caption2.monospacedDigit())
                                .foregroundStyle(Color.gsMuted)
                                .frame(width: 34, alignment: .leading)
                            Text(event.agentName)
                                .font(.caption2.weight(.semibold))
                                .foregroundStyle(event.severity.color)
                                .lineLimit(1)
                        }
                    }
                }
            }
        }
        .panelStyle()
    }
}

private struct BrandLogoView: View {
    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [Color.gsGreen.opacity(0.55), Color.gsBlue.opacity(0.18), Color.clear],
                            center: .center,
                            startRadius: 2,
                            endRadius: 34
                        )
                    )
                    .frame(width: 62, height: 62)

                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [Color.gsGreen, Color.gsBlue],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 2
                    )
                    .frame(width: 48, height: 48)

                Image(systemName: "figure.run.circle.fill")
                    .font(.system(size: 30, weight: .semibold))
                    .foregroundStyle(Color.gsText)
            }

            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .firstTextBaseline, spacing: 7) {
                    Text("GHOST")
                        .font(.system(size: 25, weight: .black, design: .rounded))
                        .tracking(3.2)
                        .foregroundStyle(Color.gsText)

                    Text("STRATEGIST")
                        .font(.system(size: 16, weight: .heavy, design: .rounded))
                        .tracking(1.1)
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.gsGreen, Color.gsBlue],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                }

                Text("REAL-TIME PERFORMANCE AGENT")
                    .font(.caption2.weight(.bold))
                    .tracking(1.8)
                    .foregroundStyle(Color.gsMuted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }

            Spacer(minLength: 0)
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: [Color.gsPanel, Color.gsTile],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(Color.white.opacity(0.10), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}

@MainActor
private final class RaceViewModel: ObservableObject {
    @Published var isRunning = false
    @Published var elapsedSeconds = 0
    @Published var mode: ActivityMode = .running
    @Published var currentDecision = StrategyDecision(
        text: "Hold steady for the first minute while the strategist calibrates your pace and heart-rate trend.",
        severity: .hold,
        tool: "Snapshot Builder"
    )
    @Published var agentVotes: [AgentVote] = []
    @Published var liveCoachingEvents: [LiveCoachingEvent] = []
    @Published var mapPosition: MapCameraPosition
    @Published var route: [TelemetryPoint]
    @Published var isRouteSnapped = false

    let sessions: [PastSession]

    var feedbackValues: [Double] {
        guard liveCoachingEvents.count >= 2 else {
            return [0.42, 0.48, 0.55, 0.58, 0.66, 0.71, 0.75, 0.78]
        }
        return liveCoachingEvents.suffix(8).enumerated().map { index, event in
            let base = 0.30 + Double(index) * 0.09
            switch event.severity {
            case .push:    return min(1.0, base + 0.12)
            case .hold:    return min(1.0, base + 0.04)
            case .recover: return min(1.0, base + 0.07)
            case .danger:  return max(0.10, base - 0.05)
            case .info:    return min(1.0, base + 0.02)
            }
        }
    }

    private let orchestrator = AgentOrchestrator()
    private let speechSynthesizer = AVSpeechSynthesizer()
    private var currentMapRegion: MKCoordinateRegion
    private var lastDecisionSecond = 0
    private var userAdjustedMap = false

    init() {
        let initialRoute = DemoRouteBuilder.makeFallbackRoute()
        let initialRegion = MKCoordinateRegion(
            center: DemoRouteBuilder.center(for: initialRoute),
            span: MKCoordinateSpan(latitudeDelta: 0.018, longitudeDelta: 0.018)
        )

        route = initialRoute
        sessions = DemoRouteBuilder.makeSessions()
        currentMapRegion = initialRegion
        mapPosition = .region(initialRegion)

        Task {
            await loadSnappedRoute()
        }
    }

    var statusText: String {
        if isRunning {
            return isRouteSnapped ? "Live snapped route" : "Live GPS simulation"
        }

        return isRouteSnapped ? "Road-snapped route" : "Loading route"
    }

    var userIndex: Int {
        min(route.count - 1, max(0, elapsedSeconds))
    }

    var ghostIndex: Int {
        min(route.count - 1, max(0, elapsedSeconds + 5))
    }

    var userPoint: TelemetryPoint {
        route[userIndex]
    }

    var ghostPoint: TelemetryPoint {
        route[ghostIndex]
    }

    var distanceMiles: Double {
        userPoint.distanceMiles
    }

    var gapMeters: Double {
        ghostPoint.distanceMeters - userPoint.distanceMeters
    }

    var gapText: String {
        if gapMeters < -1 {
            return String(format: "%.0fm ahead", abs(gapMeters))
        }
        return String(format: "%.0fm back", gapMeters)
    }

    var heartRate: Int {
        userPoint.heartRate
    }

    var hrZone: String {
        let percent = Double(heartRate) / 188.0
        switch percent {
        case ..<0.72:
            return "Aerobic"
        case ..<0.84:
            return "Tempo"
        case ..<0.92:
            return "Threshold"
        default:
            return "Bio-Guard"
        }
    }

    var hrColor: Color {
        hrZone == "Bio-Guard" ? .gsRed : hrZone == "Threshold" ? .gsOrange : .gsGreen
    }

    var paceText: String {
        let pace = max(6.6, userPoint.paceMinutesPerMile - (mode == .cycling ? 3.2 : 0))
        let minutes = Int(pace)
        let seconds = Int((pace - Double(minutes)) * 60)
        return "\(minutes):\(String(format: "%02d", seconds))"
    }

    var elapsedText: String {
        let minutes = elapsedSeconds / 60
        let seconds = elapsedSeconds % 60
        return "\(minutes):\(String(format: "%02d", seconds))"
    }

    var finishProjection: String {
        let total = route.last?.distanceMiles ?? 3.1
        let remaining = max(0, total - distanceMiles)
        let pace = userPoint.paceMinutesPerMile
        let projectedSeconds = elapsedSeconds + Int(remaining * pace * 60)
        let minutes = projectedSeconds / 60
        let seconds = projectedSeconds % 60
        return "\(minutes):\(String(format: "%02d", seconds))"
    }

    var elevationAhead: Int {
        let lookaheadIndex = min(route.count - 1, userIndex + 12)
        return Int(route[lookaheadIndex].elevationFeet - userPoint.elevationFeet)
    }

    var packetLossState: String {
        elapsedSeconds % 37 > 30 ? "simulated tunnel gap - interpolating ghost" : "normal stream"
    }

    var simulatedWindMph: Double {
        let progress = Double(elapsedSeconds) / Double(max(1, route.count))
        return 8 + sin(progress * .pi * 2) * 9
    }

    var activeAgentCount: Int {
        agentVotes.filter(\.triggered).count
    }

    func tick() {
        guard isRunning else { return }
        elapsedSeconds += 1

        if elapsedSeconds >= route.count - 1 {
            isRunning = false
        }

        if elapsedSeconds - lastDecisionSecond >= 8 || elapsedSeconds == 1 {
            currentDecision = makeDecision()
            lastDecisionSecond = elapsedSeconds
        }

        if elapsedSeconds % 4 == 0 && !userAdjustedMap {
            setMapRegion(
                MKCoordinateRegion(
                    center: userPoint.coordinate,
                    span: currentMapRegion.span
                ),
                animated: true
            )
        }
    }

    func reset() {
        isRunning = false
        elapsedSeconds = 0
        lastDecisionSecond = 0
        userAdjustedMap = false
        liveCoachingEvents = []
        speechSynthesizer.stopSpeaking(at: .word)
        currentDecision = StrategyDecision(
            text: "Ready. Start the demo race to stream telemetry and generate tactical coaching.",
            severity: .info,
            tool: "Race Control"
        )
        setMapRegion(
            MKCoordinateRegion(
                center: DemoRouteBuilder.center(for: route),
                span: MKCoordinateSpan(latitudeDelta: 0.018, longitudeDelta: 0.018)
            ),
            animated: true
        )
    }

    func zoomIn() {
        zoom(by: 0.55)
    }

    func zoomOut() {
        zoom(by: 1.8)
    }

    private func zoom(by factor: Double) {
        userAdjustedMap = true
        let span = currentMapRegion.span
        let nextLatitudeDelta = min(max(span.latitudeDelta * factor, 0.0015), 0.08)
        let nextLongitudeDelta = min(max(span.longitudeDelta * factor, 0.0015), 0.08)

        setMapRegion(
            MKCoordinateRegion(
                center: currentMapRegion.center,
                span: MKCoordinateSpan(
                    latitudeDelta: nextLatitudeDelta,
                    longitudeDelta: nextLongitudeDelta
                )
            ),
            animated: true
        )
    }

    private func setMapRegion(_ region: MKCoordinateRegion, animated: Bool) {
        currentMapRegion = region

        if animated {
            withAnimation(.easeInOut(duration: 0.25)) {
                mapPosition = .region(region)
            }
        } else {
            mapPosition = .region(region)
        }
    }

    private func loadSnappedRoute() async {
        guard let coordinates = await DemoRouteBuilder.makeRoadSnappedCoordinates() else {
            return
        }

        let nextRoute = DemoRouteBuilder.makeRoute(from: coordinates)
        guard nextRoute.count > 20 else {
            return
        }

        route = nextRoute
        isRouteSnapped = true
        elapsedSeconds = min(elapsedSeconds, max(0, route.count - 1))

        guard !userAdjustedMap else {
            return
        }

        setMapRegion(
            MKCoordinateRegion(
                center: DemoRouteBuilder.center(for: nextRoute),
                span: MKCoordinateSpan(latitudeDelta: 0.012, longitudeDelta: 0.012)
            ),
            animated: true
        )
    }

    private func makeDecision() -> StrategyDecision {
        let state = RaceState(
            heartRate: heartRate,
            elevationAhead: elevationAhead,
            gapMeters: gapMeters,
            elapsedSeconds: elapsedSeconds,
            windMph: simulatedWindMph
        )
        let (decision, votes) = orchestrator.decide(state)
        agentVotes = votes
        liveCoachingEvents.append(LiveCoachingEvent(
            second: elapsedSeconds,
            agentName: decision.tool,
            severity: decision.severity,
            instruction: decision.text
        ))
        speak(decision.text)
        return decision
    }

    private func speak(_ text: String) {
        speechSynthesizer.stopSpeaking(at: .word)
        let utterance = AVSpeechUtterance(string: text)
        utterance.rate = 0.50
        utterance.pitchMultiplier = 1.05
        utterance.volume = 0.85
        speechSynthesizer.speak(utterance)
    }
}

private enum ActivityMode: String {
    case running = "Run"
    case cycling = "Ride"
}

private struct TelemetryPoint: Identifiable {
    let id = UUID()
    let coordinate: CLLocationCoordinate2D
    let distanceMeters: Double
    let distanceMiles: Double
    let paceMinutesPerMile: Double
    let elevationFeet: Double
    let heartRate: Int
}

private struct StrategyDecision {
    let text: String
    let severity: DecisionSeverity
    let tool: String
    let contributingAgents: [String]

    init(text: String, severity: DecisionSeverity, tool: String, contributingAgents: [String] = []) {
        self.text = text
        self.severity = severity
        self.tool = tool
        self.contributingAgents = contributingAgents
    }
}

// MARK: - Multi-Agent Architecture

private struct RaceState {
    let heartRate: Int
    let elevationAhead: Int
    let gapMeters: Double
    let elapsedSeconds: Int
    let windMph: Double
}

private struct AgentVote {
    let agentName: String
    let severity: DecisionSeverity
    let text: String
    let confidence: Double
    let triggered: Bool
}

private struct BioGuardAgent {
    let name = "Bio-Guard"
    func evaluate(_ state: RaceState) -> AgentVote {
        let triggered = state.heartRate >= 174
        let confidence = triggered ? min(1.0, Double(state.heartRate - 174) / 12.0 + 0.85) : 0
        return AgentVote(agentName: name, severity: .danger,
            text: "Bio-Guard: ease off now. Drop effort for 45 seconds and let heart rate settle before chasing the ghost.",
            confidence: confidence, triggered: triggered)
    }
}

private struct HeartRateAnalysisAgent {
    let name = "Heart Rate Analysis"
    func evaluate(_ state: RaceState) -> AgentVote {
        let triggered = state.heartRate > 160 && state.heartRate < 174
        let confidence = triggered ? min(0.75, Double(state.heartRate - 160) / 14.0 * 0.75) : 0
        return AgentVote(agentName: name, severity: .recover,
            text: "Hold this effort. You are near threshold — protect breathing rhythm before the next move.",
            confidence: confidence, triggered: triggered)
    }
}

private struct ElevationScanAgent {
    let name = "Upcoming Elevation Scan"
    func evaluate(_ state: RaceState) -> AgentVote {
        let triggered = state.elevationAhead > 25 && state.gapMeters < 45
        let confidence = triggered ? min(0.85, Double(state.elevationAhead) / 60.0 * 0.85) : 0
        return AgentVote(agentName: name, severity: .push,
            text: "Climb ahead. Increase cadence now, then hold form over the top instead of sprinting the hill.",
            confidence: confidence, triggered: triggered)
    }
}

private struct DynamicPacerAgent {
    let name = "Dynamic Pacer"
    func evaluate(_ state: RaceState) -> AgentVote {
        let triggered = state.gapMeters > 55
        let confidence = triggered ? min(0.9, (state.gapMeters - 55) / 60.0 * 0.9) : 0
        return AgentVote(agentName: name, severity: .push,
            text: "The ghost is opening the gap. Add a controlled 20-second surge, then return to target pace.",
            confidence: confidence, triggered: triggered)
    }
}

private struct WeatherAnalystAgent {
    let name = "Terrain and Weather Analyst"
    func evaluate(_ state: RaceState) -> AgentVote {
        let triggered = state.windMph >= 14
        let confidence = triggered ? min(0.7, (state.windMph - 14) / 10.0 * 0.3 + 0.4) : 0
        return AgentVote(agentName: name, severity: .hold,
            text: "Headwind detected. Stay smooth and maintain steady effort — don't fight the wind.",
            confidence: confidence, triggered: triggered)
    }
}

private struct FinishPredictorAgent {
    let name = "Predict Finish Time"
    func evaluate(_ state: RaceState) -> AgentVote {
        AgentVote(agentName: name, severity: .hold,
            text: "Good position. Stay relaxed and keep the ghost within five seconds through this flat section.",
            confidence: 0.3, triggered: true)
    }
}

private struct AgentOrchestrator {
    func decide(_ state: RaceState) -> (decision: StrategyDecision, votes: [AgentVote]) {
        let votes = [
            BioGuardAgent().evaluate(state),
            HeartRateAnalysisAgent().evaluate(state),
            ElevationScanAgent().evaluate(state),
            DynamicPacerAgent().evaluate(state),
            WeatherAnalystAgent().evaluate(state),
            FinishPredictorAgent().evaluate(state)
        ]

        // Bio-Guard safety override always wins
        if let bio = votes.first(where: { $0.agentName == "Bio-Guard" && $0.triggered }) {
            let supporting = votes.filter { $0.triggered && $0.agentName != bio.agentName }.map(\.agentName)
            return (StrategyDecision(text: bio.text, severity: bio.severity,
                tool: bio.agentName, contributingAgents: supporting), votes)
        }

        // Otherwise pick highest-confidence triggered agent
        let triggered = votes.filter(\.triggered)
        let winner = triggered.max(by: { $0.confidence < $1.confidence }) ?? votes.last!
        let supporting = triggered.filter { $0.agentName != winner.agentName }.map(\.agentName)

        return (StrategyDecision(text: winner.text, severity: winner.severity,
            tool: winner.agentName, contributingAgents: supporting), votes)
    }
}

private enum DecisionSeverity {
    case info
    case hold
    case push
    case recover
    case danger

    var color: Color {
        switch self {
        case .info:
            return .gsBlue
        case .hold:
            return .gsGreen
        case .push:
            return .gsOrange
        case .recover:
            return .gsPurple
        case .danger:
            return .gsRed
        }
    }

    var title: String {
        switch self {
        case .info:
            return "Ready"
        case .hold:
            return "Hold"
        case .push:
            return "Push"
        case .recover:
            return "Recover"
        case .danger:
            return "Safety"
        }
    }

    var icon: String {
        switch self {
        case .info:
            return "info.circle.fill"
        case .hold:
            return "equal.circle.fill"
        case .push:
            return "bolt.fill"
        case .recover:
            return "lungs.fill"
        case .danger:
            return "exclamationmark.shield.fill"
        }
    }
}

private struct CoachingEventRecord: Identifiable {
    let id = UUID()
    let elapsed: String
    let agentName: String
    let severity: DecisionSeverity
    let instruction: String
}

private struct LiveCoachingEvent: Identifiable {
    let id = UUID()
    let second: Int
    let agentName: String
    let severity: DecisionSeverity
    let instruction: String
}

private struct PastSession: Identifiable {
    let id = UUID()
    let title: String
    let mode: ActivityMode
    let distance: String
    let time: String
    let avgPace: String
    let avgHR: String
    let quality: String
    let notes: String
    let chart: [Double]
    let narrative: [String]
    let rawPoints: Int
    let smoothedPoints: Int
    let packetLossEvents: Int
    let coachingEvents: [CoachingEventRecord]
}

private enum DemoRouteBuilder {
    static func makeFallbackRoute() -> [TelemetryPoint] {
        makeRoute(from: demoWaypoints)
    }

    static func makeRoute(from coordinates: [CLLocationCoordinate2D]) -> [TelemetryPoint] {
        let segmentLengths = zip(coordinates, coordinates.dropFirst()).map { start, end in
            distance(from: start, to: end)
        }
        let totalDistance = segmentLengths.reduce(0, +)
        var points: [TelemetryPoint] = []
        var distanceMeters = 0.0

        for index in 0..<96 {
            let progress = Double(index) / 95.0
            let coordinate = coordinate(
                at: totalDistance * progress,
                coordinates: coordinates,
                segmentLengths: segmentLengths
            )
            let elevation = 84.0 + sin(progress * .pi * 3.0) * 16.0 + max(0, progress - 0.55) * 42.0
            let pace = 7.95 - min(progress * 0.34, 0.34) + sin(progress * .pi * 5.0) * 0.12
            let heartRate = 132 + Int(progress * 44.0) + (progress > 0.62 ? 9 : 0)

            if let previous = points.last {
                distanceMeters += distance(from: previous.coordinate, to: coordinate)
            }

            points.append(
                TelemetryPoint(
                    coordinate: coordinate,
                    distanceMeters: distanceMeters,
                    distanceMiles: distanceMeters / 1609.344,
                    paceMinutesPerMile: pace,
                    elevationFeet: elevation,
                    heartRate: heartRate
                )
            )
        }

        return points
    }

    static func makeRoadSnappedCoordinates() async -> [CLLocationCoordinate2D]? {
        var snappedCoordinates: [CLLocationCoordinate2D] = []

        for index in 0..<(demoWaypoints.count - 1) {
            let request = MKDirections.Request()
            request.source = mapItem(for: demoWaypoints[index])
            request.destination = mapItem(for: demoWaypoints[index + 1])
            request.transportType = .walking
            request.requestsAlternateRoutes = false

            do {
                guard let route = try await MKDirections(request: request).calculate().routes.first else {
                    continue
                }

                var segmentCoordinates = coordinates(from: route.polyline)
                if !snappedCoordinates.isEmpty && !segmentCoordinates.isEmpty {
                    segmentCoordinates.removeFirst()
                }
                snappedCoordinates.append(contentsOf: segmentCoordinates)
            } catch {
                return nil
            }
        }

        return snappedCoordinates.isEmpty ? nil : snappedCoordinates
    }

    static func center(for route: [TelemetryPoint]) -> CLLocationCoordinate2D {
        let coordinates = route.map(\.coordinate)
        let latitude = coordinates.map(\.latitude).reduce(0, +) / Double(coordinates.count)
        let longitude = coordinates.map(\.longitude).reduce(0, +) / Double(coordinates.count)
        return CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    static func makeSessions() -> [PastSession] {
        [
            PastSession(
                title: "Campus Loop Personal Best",
                mode: .running,
                distance: "3.12 mi",
                time: "24:08",
                avgPace: "7:44 /mi",
                avgHR: "158 bpm",
                quality: "98%",
                notes: "Best split after the second hill. Ghost target is stored for replay.",
                chart: [0.72, 0.67, 0.64, 0.61, 0.56, 0.54, 0.52, 0.50],
                narrative: [
                    "At 3:12, Upcoming Elevation Scan detected a 28 ft climb. The agent issued a Push advisory to build a gap before the hill.",
                    "At 8:45, heart rate reached 171 bpm (91% of max). Bio-Guard switched the agent to Recovery mode for 45 seconds.",
                    "Between 12:00–18:00, the agent issued 3 Push advisories closing a 55 m gap. Pace improved from 8:02 to 7:31 /mi.",
                    "Final result: finished 12 seconds ahead of the ghost with 6 coaching interventions."
                ],
                rawPoints: 1448,
                smoothedPoints: 1445,
                packetLossEvents: 1,
                coachingEvents: [
                    CoachingEventRecord(elapsed: "3:12", agentName: "Upcoming Elevation Scan", severity: .push, instruction: "Climb ahead. Increase cadence now, then hold form over the top."),
                    CoachingEventRecord(elapsed: "8:45", agentName: "Bio-Guard", severity: .danger, instruction: "Bio-Guard: ease off now. Drop effort for 45 seconds and let heart rate settle."),
                    CoachingEventRecord(elapsed: "12:04", agentName: "Dynamic Pacer", severity: .push, instruction: "The ghost is opening the gap. Add a controlled 20-second surge."),
                    CoachingEventRecord(elapsed: "15:30", agentName: "Dynamic Pacer", severity: .push, instruction: "The ghost is opening the gap. Add a controlled 20-second surge."),
                    CoachingEventRecord(elapsed: "18:22", agentName: "Heart Rate Analysis", severity: .recover, instruction: "Hold this effort. You are near threshold — protect breathing rhythm."),
                    CoachingEventRecord(elapsed: "21:50", agentName: "Dynamic Pacer", severity: .push, instruction: "Final push. The ghost is within 12 seconds — lift cadence and hold.")
                ]
            ),
            PastSession(
                title: "Guadalupe River Ride",
                mode: .cycling,
                distance: "9.6 mi",
                time: "34:41",
                avgPace: "16.6 mph",
                avgHR: "146 bpm",
                quality: "95%",
                notes: "Wind-adjusted strategist held the ghost on the return section.",
                chart: [0.35, 0.39, 0.44, 0.48, 0.51, 0.57, 0.61, 0.66],
                narrative: [
                    "At 5:20, Terrain and Weather Analyst detected 16 mph headwind. The agent issued a Hold advisory to conserve effort.",
                    "At 18:00, the tailwind return leg began. The agent issued 2 Push advisories, reducing the ghost gap from 48 m to 11 m.",
                    "At 28:15, heart rate reached 163 bpm (87% of max). Heart Rate Analysis suppressed a Push recommendation.",
                    "Final result: finished 4 seconds behind the ghost with 5 coaching interventions."
                ],
                rawPoints: 2081,
                smoothedPoints: 2074,
                packetLossEvents: 2,
                coachingEvents: [
                    CoachingEventRecord(elapsed: "5:20", agentName: "Terrain and Weather Analyst", severity: .hold, instruction: "Headwind detected. Stay smooth and maintain steady effort — don't fight the wind."),
                    CoachingEventRecord(elapsed: "11:08", agentName: "Dynamic Pacer", severity: .push, instruction: "The ghost is opening the gap. Add a controlled 20-second surge."),
                    CoachingEventRecord(elapsed: "18:44", agentName: "Dynamic Pacer", severity: .push, instruction: "Tailwind return leg. The ghost is within reach — lift the pace."),
                    CoachingEventRecord(elapsed: "28:15", agentName: "Heart Rate Analysis", severity: .recover, instruction: "Hold this effort. You are near threshold — protect breathing rhythm."),
                    CoachingEventRecord(elapsed: "32:02", agentName: "Predict Finish Time", severity: .hold, instruction: "Good position. Stay relaxed and keep the ghost within five seconds.")
                ]
            )
        ]
    }

    private static func distance(from start: CLLocationCoordinate2D, to end: CLLocationCoordinate2D) -> Double {
        let startLocation = CLLocation(latitude: start.latitude, longitude: start.longitude)
        let endLocation = CLLocation(latitude: end.latitude, longitude: end.longitude)
        return startLocation.distance(from: endLocation)
    }

    private static let demoWaypoints = [
        CLLocationCoordinate2D(latitude: 37.33263, longitude: -121.88310),
        CLLocationCoordinate2D(latitude: 37.33467, longitude: -121.88481),
        CLLocationCoordinate2D(latitude: 37.33710, longitude: -121.88686),
        CLLocationCoordinate2D(latitude: 37.33873, longitude: -121.88305),
        CLLocationCoordinate2D(latitude: 37.33905, longitude: -121.87986),
        CLLocationCoordinate2D(latitude: 37.33682, longitude: -121.87806),
        CLLocationCoordinate2D(latitude: 37.33435, longitude: -121.87609),
        CLLocationCoordinate2D(latitude: 37.33358, longitude: -121.87878),
        CLLocationCoordinate2D(latitude: 37.33263, longitude: -121.88310)
    ]

    private static func coordinate(
        at targetDistance: Double,
        coordinates: [CLLocationCoordinate2D],
        segmentLengths: [Double]
    ) -> CLLocationCoordinate2D {
        var traveled = 0.0

        for index in segmentLengths.indices {
            let segmentLength = segmentLengths[index]

            if targetDistance <= traveled + segmentLength {
                let progress = segmentLength == 0 ? 0 : (targetDistance - traveled) / segmentLength
                let start = coordinates[index]
                let end = coordinates[index + 1]

                return CLLocationCoordinate2D(
                    latitude: start.latitude + (end.latitude - start.latitude) * progress,
                    longitude: start.longitude + (end.longitude - start.longitude) * progress
                )
            }

            traveled += segmentLength
        }

        return coordinates.last ?? CLLocationCoordinate2D(latitude: 37.3352, longitude: -121.8811)
    }

    private static func mapItem(for coordinate: CLLocationCoordinate2D) -> MKMapItem {
        MKMapItem(location: CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude), address: nil)
    }

    private static func coordinates(from polyline: MKPolyline) -> [CLLocationCoordinate2D] {
        var coordinates = Array(
            repeating: CLLocationCoordinate2D(latitude: 0, longitude: 0),
            count: polyline.pointCount
        )
        polyline.getCoordinates(&coordinates, range: NSRange(location: 0, length: polyline.pointCount))
        return coordinates
    }
}

private struct HeroMetric: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.white.opacity(0.68))
            Text(value)
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.white.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

private struct StatTile: View {
    let label: String
    let value: String
    let unit: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .font(.headline)
                    .foregroundStyle(color)
                Spacer()
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(label)
                    .font(.caption)
                    .foregroundStyle(Color.gsMuted)
                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    Text(value)
                        .font(.title2.weight(.bold))
                        .foregroundStyle(Color.gsText)
                        .lineLimit(1)
                        .minimumScaleFactor(0.65)
                    if !unit.isEmpty {
                        Text(unit)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color.gsMuted)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, minHeight: 108, alignment: .leading)
        .padding(16)
        .background(Color.gsPanel)
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.white.opacity(0.07), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

private struct SectionHeader: View {
    let title: String
    let icon: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundStyle(Color.gsGreen)
            Text(title)
                .font(.headline.weight(.bold))
                .foregroundStyle(Color.gsText)
            Spacer()
        }
    }
}

private struct ToolRow: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.headline)
                .foregroundStyle(Color.gsBlue)
                .frame(width: 30, height: 30)
                .background(Color.gsBlue.opacity(0.12))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.gsText)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(Color.gsMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

private struct FlowStep: View {
    let number: String
    let title: String
    let detail: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(number)
                .font(.caption.weight(.bold))
                .foregroundStyle(.white)
                .frame(width: 26, height: 26)
                .background(Color.gsGreen)
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.gsText)
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(Color.gsMuted)
            }
        }
    }
}

private struct RunnerMarker: View {
    let color: Color
    let icon: String

    var body: some View {
        ZStack {
            Circle()
                .fill(color.opacity(0.2))
                .frame(width: 46, height: 46)
            Circle()
                .fill(color)
                .frame(width: 30, height: 30)
            Image(systemName: icon)
                .font(.caption.weight(.bold))
                .foregroundStyle(.white)
        }
        .shadow(color: color.opacity(0.35), radius: 8, y: 5)
    }
}

private struct MapZoomControls: View {
    let onZoomIn: () -> Void
    let onZoomOut: () -> Void

    var body: some View {
        VStack(spacing: 8) {
            Button(action: onZoomIn) {
                Image(systemName: "plus")
                    .frame(width: 34, height: 34)
            }
            .accessibilityLabel("Zoom in")

            Button(action: onZoomOut) {
                Image(systemName: "minus")
                    .frame(width: 34, height: 34)
            }
            .accessibilityLabel("Zoom out")
        }
        .font(.headline.weight(.bold))
        .foregroundStyle(Color.gsText)
        .background(Color.gsPanel.opacity(0.92))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.white.opacity(0.12), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

private struct CoachingBanner: View {
    let decision: StrategyDecision

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: decision.severity.icon)
                .font(.title3)
                .foregroundStyle(.white)
                .frame(width: 42, height: 42)
                .background(decision.severity.color)
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(decision.severity.title)
                        .font(.headline.weight(.bold))
                        .foregroundStyle(Color.gsText)
                    Spacer()
                    Text(decision.tool)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(decision.severity.color)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }

                Text(decision.text)
                    .font(.subheadline)
                    .foregroundStyle(Color.gsText)
                    .fixedSize(horizontal: false, vertical: true)

                if !decision.contributingAgents.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.triangle.branch")
                            .font(.caption2)
                            .foregroundStyle(Color.gsMuted)
                        Text("Also active: \(decision.contributingAgents.joined(separator: " · "))")
                            .font(.caption2)
                            .foregroundStyle(Color.gsMuted)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                }
            }
        }
        .padding(16)
        .background(Color.gsPanel)
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(decision.severity.color.opacity(0.25), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}

private struct SnapshotRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack(alignment: .top) {
            Text(label)
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color.gsMuted)
                .frame(width: 130, alignment: .leading)
            Text(value)
                .font(.caption)
                .foregroundStyle(Color.gsText)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

private struct SessionCard: View {
    let session: PastSession

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(session.title)
                        .font(.headline.weight(.bold))
                        .foregroundStyle(Color.gsText)
                    Text(session.notes)
                        .font(.caption)
                        .foregroundStyle(Color.gsMuted)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer()
                Text(session.mode.rawValue)
                    .font(.caption.weight(.bold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.gsGreen.opacity(0.14))
                    .foregroundStyle(Color.gsGreen)
                    .clipShape(Capsule())
            }

            HStack(spacing: 10) {
                CompactMetric(label: "Distance", value: session.distance)
                CompactMetric(label: "Time", value: session.time)
                CompactMetric(label: "Pace", value: session.avgPace)
            }

            MiniChart(values: session.chart, color: session.mode == .running ? .gsGreen : .gsBlue)
                .frame(height: 74)

            HStack {
                Label(session.avgHR, systemImage: "heart.fill")
                Spacer()
                Label("Quality \(session.quality)", systemImage: "checkmark.seal.fill")
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(Color.gsMuted)

            Divider()
                .background(Color.white.opacity(0.08))

            VStack(alignment: .leading, spacing: 6) {
                Label("Race Narrative", systemImage: "text.quote")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Color.gsGreen)
                ForEach(session.narrative, id: \.self) { line in
                    HStack(alignment: .top, spacing: 6) {
                        Text("·")
                            .foregroundStyle(Color.gsMuted)
                        Text(line)
                            .font(.caption)
                            .foregroundStyle(Color.gsMuted)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
        .panelStyle()
    }
}

private struct PipelineTile: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(Color.gsMuted)
            Text(value)
                .font(.title3.weight(.bold))
                .foregroundStyle(Color.gsText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.gsTile)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private struct CompactMetric: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(Color.gsMuted)
            Text(value)
                .font(.caption.weight(.bold))
                .foregroundStyle(Color.gsText)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(Color.gsTile)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private struct MiniChart: View {
    let values: [Double]
    let color: Color

    var body: some View {
        GeometryReader { proxy in
            let width = proxy.size.width
            let height = proxy.size.height
            let maxValue = values.max() ?? 1
            let minValue = values.min() ?? 0
            let span = max(0.01, maxValue - minValue)
            let step = values.count > 1 ? width / CGFloat(values.count - 1) : 0

            Path { path in
                for index in values.indices {
                    let x = CGFloat(index) * step
                    let normalized = (values[index] - minValue) / span
                    let y = height - CGFloat(normalized) * height
                    if index == values.startIndex {
                        path.move(to: CGPoint(x: x, y: y))
                    } else {
                        path.addLine(to: CGPoint(x: x, y: y))
                    }
                }
            }
            .stroke(color, style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round))
        }
        .padding(12)
        .background(Color.gsTile)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

private struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.bold))
            .foregroundStyle(.white)
            .padding(.horizontal, 14)
            .frame(height: 46)
            .background(Color.gsGreen.opacity(configuration.isPressed ? 0.75 : 1))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

private struct IconButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.bold))
            .foregroundStyle(Color.gsText)
            .background(Color.gsPanel.opacity(configuration.isPressed ? 0.65 : 1))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

private extension View {
    func panelStyle() -> some View {
        padding(16)
            .background(Color.gsPanel)
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(Color.white.opacity(0.07), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}

private extension Color {
    static let gsBackground = Color(red: 0.015, green: 0.018, blue: 0.024)
    static let gsPanel = Color(red: 0.055, green: 0.065, blue: 0.082)
    static let gsTile = Color(red: 0.085, green: 0.098, blue: 0.125)
    static let gsInk = Color(red: 0.02, green: 0.025, blue: 0.035)
    static let gsText = Color(red: 0.94, green: 0.97, blue: 0.96)
    static let gsMuted = Color(red: 0.66, green: 0.72, blue: 0.72)
    static let gsGreen = Color(red: 0.18, green: 0.86, blue: 0.55)
    static let gsBlue = Color(red: 0.30, green: 0.58, blue: 1.00)
    static let gsOrange = Color(red: 1.00, green: 0.61, blue: 0.24)
    static let gsRed = Color(red: 1.00, green: 0.26, blue: 0.32)
    static let gsPurple = Color(red: 0.68, green: 0.50, blue: 1.00)
}

private struct SessionDetailView: View {
    let session: PastSession
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    statsGrid
                    chartSection
                    if !session.coachingEvents.isEmpty {
                        coachingEventsSection
                    }
                    narrativeSection
                    pipelineSection
                }
                .padding(16)
            }
            .background(Color.gsBackground)
            .navigationTitle(session.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.gsBackground, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(Color.gsGreen)
                        .fontWeight(.semibold)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private var statsGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            CompactMetric(label: "Distance", value: session.distance)
            CompactMetric(label: "Time", value: session.time)
            CompactMetric(label: "Avg Pace", value: session.avgPace)
            CompactMetric(label: "Avg HR", value: session.avgHR)
            CompactMetric(label: "Data Quality", value: session.quality)
            CompactMetric(label: "Packet Loss", value: "\(session.packetLossEvents) events")
        }
    }

    private var chartSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "Pace Over Time", icon: "waveform.path.ecg")
            MiniChart(values: session.chart, color: session.mode == .running ? .gsGreen : .gsBlue)
                .frame(height: 92)
        }
        .panelStyle()
    }

    private var coachingEventsSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "Agent Coaching Events", icon: "brain.head.profile")
            ForEach(session.coachingEvents) { event in
                HStack(alignment: .top, spacing: 12) {
                    Circle()
                        .fill(event.severity.color)
                        .frame(width: 8, height: 8)
                        .padding(.top, 5)
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 6) {
                            Text(event.elapsed)
                                .font(.caption2.weight(.semibold).monospacedDigit())
                                .foregroundStyle(Color.gsMuted)
                            Text("·")
                                .foregroundStyle(Color.gsMuted)
                            Text(event.agentName)
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(event.severity.color)
                                .lineLimit(1)
                        }
                        Text(event.instruction)
                            .font(.caption)
                            .foregroundStyle(Color.gsText)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(.vertical, 2)
            }
        }
        .panelStyle()
    }

    private var narrativeSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "Race Narrative", icon: "text.quote")
            ForEach(session.narrative, id: \.self) { line in
                HStack(alignment: .top, spacing: 8) {
                    Text("·")
                        .foregroundStyle(Color.gsGreen)
                        .fontWeight(.bold)
                    Text(line)
                        .font(.subheadline)
                        .foregroundStyle(Color.gsMuted)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .panelStyle()
    }

    private var pipelineSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "Data Pipeline", icon: "waveform.path")
            Text("GPS telemetry passes through EMA smoothing (α = 0.3), outlier filtering (accuracy > 50 m), and gap interpolation before analytics.")
                .font(.caption)
                .foregroundStyle(Color.gsMuted)
                .fixedSize(horizontal: false, vertical: true)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                PipelineTile(label: "Raw points", value: "\(session.rawPoints)")
                PipelineTile(label: "After smoothing", value: "\(session.smoothedPoints)")
                PipelineTile(label: "Outliers removed", value: "\(session.rawPoints - session.smoothedPoints)")
                PipelineTile(label: "Packet loss events", value: "\(session.packetLossEvents)")
            }
        }
        .panelStyle()
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
