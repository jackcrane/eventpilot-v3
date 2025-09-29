import SwiftUI

struct SettingsScreen: View {
    var body: some View {
        NavigationStack {
            List {
                Text("Settings page")
            }
            .navigationTitle("Settings")
        }
    }
}

#Preview {
    SettingsScreen()
}
