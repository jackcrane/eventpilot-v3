import SwiftUI

struct PointOfSaleScreen: View {
    var body: some View {
        NavigationStack {
            List {
                Text("PointOfSaleScreen page")
            }
            .navigationTitle("PointOfSaleScreen")
        }
    }
}

#Preview {
    PointOfSaleScreen()
}
