//
//  LoginLauncherScreen.swift
//  EventPilot Day Of Dashboard
//
//  Updated with PIN-based authentication flow.
//

import SwiftUI

struct LoginLauncherScreen: View {
    @EnvironmentObject private var sessionStore: DayOfSessionStore
    @State private var pin: String = ""
    @FocusState private var pinFieldFocused: Bool

    private var loginDisabled: Bool {
        sessionStore.isLoggingIn || !pinAllDigits(pin)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("EventPilot")
                            .font(.system(.largeTitle, weight: .semibold))
                        Text("Enter the access PIN provided on the admin dashboard to sign in.")
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }

                Section("Access PIN") {
                    TextField("6-digit PIN", text: $pin)
                        .keyboardType(.numberPad)
                        .focused($pinFieldFocused)
                        .textContentType(.oneTimeCode)
                        .multilineTextAlignment(.center)
                        .font(.system(.title2, design: .monospaced))
                        .onChange(of: pin) { newValue in
                            pin = sanitizePin(newValue)
                        }

                    if let error = sessionStore.loginErrorMessage {
                        Text(error)
                            .foregroundStyle(.red)
                    }
                }

                Section {
                    Button {
                        Task { await sessionStore.login(withPin: pin) }
                    } label: {
                        if sessionStore.isLoggingIn {
                            ProgressView()
                                .progressViewStyle(.circular)
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("Log In")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .disabled(loginDisabled)
                } footer: {
                    Text("Need a PIN? Create a day-of dashboard access code from the EventPilot admin dashboard.")
                }
            }
        }
        .onAppear { pinFieldFocused = true }
        .onChange(of: sessionStore.session != nil) { hasSession in
            if hasSession {
                pin.removeAll()
            }
        }
    }

    private func sanitizePin(_ value: String) -> String {
        let digits = value.filter { $0.isNumber }
        return String(digits.prefix(6))
    }

    private func pinAllDigits(_ value: String) -> Bool {
        value.count == 6 && value.allSatisfy { $0.isNumber }
    }
}

#Preview {
    LoginLauncherScreen()
        .environmentObject(DayOfSessionStore())
}
