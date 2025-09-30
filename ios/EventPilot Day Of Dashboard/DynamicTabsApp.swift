import SwiftUI

@main
struct DynamicTabsApp: App {
    @StateObject private var sessionStore = DayOfSessionStore.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(sessionStore)
        }
    }
}
