import Foundation
import Combine

@MainActor
final class PermissionsStore: ObservableObject {
    @Published var allowedFeatures: [Feature] = []
    @Published var isLoading = true
    @Published var errorMessage: String?

    init() {
        Task { await load() }
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        do {
            // Simulate API latency; replace with URLSession decode later.
            try await Task.sleep(nanoseconds: 500_000_000)
            // Mock: imagine API returned ["participants", "volunteers", "pointOfSale", "settings"]
            let mock: [Feature] = [.participants, .volunteers, .pointOfSale, .settings]
            allowedFeatures = mock
            isLoading = false
        } catch {
            errorMessage = "Failed to load permissions."
            isLoading = false
        }
    }
}

