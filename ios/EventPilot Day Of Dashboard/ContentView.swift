//
//  ContentView.swift
//  EventPilot Day Of Dashboard
//
//  Updated for day-of dashboard auth flow.
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var sessionStore: DayOfSessionStore
    @State private var selection: Feature?

    private var shouldPresentNamePrompt: Bool {
        sessionStore.needsAccountNamePrompt && sessionStore.session != nil
    }

    private var features: [Feature] { sessionStore.allowedFeatures }

    var body: some View {
        ZStack {
            if sessionStore.isRestoring {
                ProgressView("Restoring session…")
            } else if sessionStore.session == nil {
                LoginLauncherScreen()
            } else {
                dashboardTabs
            }
        }
        .onAppear { updateSelection(using: features) }
        .onChange(of: features) { updateSelection(using: $0) }
        .sheet(isPresented: Binding(
            get: { shouldPresentNamePrompt },
            set: { isPresented in
                if !isPresented {
                    sessionStore.needsAccountNamePrompt = false
                }
            }
        )) {
            AccountNamePromptView()
                .environmentObject(sessionStore)
        }
        .alert("Session Ended", isPresented: $sessionStore.showingInvalidTokenAlert, actions: {
            Button("Log In Again") {
                sessionStore.acknowledgeInvalidTokenAlert()
            }
        }, message: {
            Text("Your access token is no longer valid. Please enter your PIN to continue.")
        })
    }

    private var dashboardTabs: some View {
        TabView(selection: $selection) {
            ForEach(features) { feature in
                feature.destination()
                    .tabItem {
                        Image(systemName: feature.systemImage)
                        Text(feature.title)
                    }
                    .tag(Optional(feature))
            }
        }
    }
}

private extension ContentView {
    func updateSelection(using features: [Feature]) {
        guard let first = features.first else {
            selection = nil
            return
        }

        if let selection, features.contains(selection) { return }
        selection = first
    }
}

#Preview {
    ContentView()
        .environmentObject(DayOfSessionStore())
}
