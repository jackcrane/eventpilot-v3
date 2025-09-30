import SwiftUI

struct PointOfSaleScreen: View {
    @EnvironmentObject private var sessionStore: DayOfSessionStore

    var body: some View {
        NavigationStack {
            List {
                Section("Point of Sale") {
                    Text("Point of sale functionality will sync here once configured for your event.")
                        .foregroundStyle(.secondary)
                    if let expiresAt = sessionStore.session?.expiresAt {
                        Text("Token expires \(Self.relativeFormatter.localizedString(for: expiresAt, relativeTo: Date())).")
                            .font(.callout)
                    }
                }
            }
            .navigationTitle("Point of Sale")
        }
    }

    private static let relativeFormatter: RelativeDateTimeFormatter = {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter
    }()
}

#Preview {
    PointOfSaleScreen()
        .environmentObject(DayOfSessionStore())
}
