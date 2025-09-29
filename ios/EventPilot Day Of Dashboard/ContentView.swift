//
//  ContentView.swift
//  EventPilot Day Of Dashboard
//
//  Created by Jack Crane on 9/29/25.
//

import SwiftUI

struct ContentView: View {
    @StateObject private var store = PermissionsStore()
    @State private var selection: Feature?

    var body: some View {
        Group {
            if store.isLoading {
                ProgressView("Loading…")
            } else if let msg = store.errorMessage {
                VStack(spacing: 12) {
                    Text(msg).foregroundColor(.red)
                    Button("Retry") { Task { await store.load() } }
                }
            } else if store.allowedFeatures.isEmpty {
                Text("No access.").foregroundColor(.secondary)
            } else {
                TabView(selection: $selection) {
                    ForEach(store.allowedFeatures) { feature in
                        feature.destination()
                            .tabItem {
                                Image(systemName: feature.systemImage)
                                Text(feature.title)
                            }
                            .tag(Optional(feature))
                    }
                }
                .onAppear { if selection == nil { selection = store.allowedFeatures.first } }
            }
        }
        .animation(.default, value: store.allowedFeatures)
    }
}

#Preview {
    ContentView()
}
