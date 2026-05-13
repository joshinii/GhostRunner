//
//  GhostRunnerApp.swift
//  GhostRunner
//
//  Created by Spartan on 5/6/26.
//

import SwiftUI

@main
struct GhostRunnerApp: App {
    init() {
        print("[GhostStrategist] Native SwiftUI shell launched. React Native is not running in this target.")
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
