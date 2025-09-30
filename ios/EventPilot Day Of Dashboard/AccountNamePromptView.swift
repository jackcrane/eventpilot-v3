import SwiftUI

struct AccountNamePromptView: View {
    @EnvironmentObject private var sessionStore: DayOfSessionStore
    @State private var name: String = ""
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Form {
                Section(
                    content: {
                        TextField("Device name", text: $name)
                            .textInputAutocapitalization(.words)
                            .autocorrectionDisabled()
                    },
                    header: {
                        Text("Give this dashboard a name")
                    },
                    footer: {
                        Text("This name helps your team identify this iPad on the admin dashboard.")
                    }
                )

                if let message = sessionStore.accountNameErrorMessage {
                    Section {
                        Text(message)
                            .foregroundColor(.red)
                    }
                }

                Section {
                    Button("Save Name") {
                        Task { await saveName() }
                    }
                    .disabled(isSaving || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                    Button("Log Out", role: .destructive) {
                        sessionStore.logout()
                    }
                }
            }
            .navigationTitle("Name This Device")
            .toolbar { toolbarContent }
        }
        .interactiveDismissDisabled()
        .onAppear {
            name = sessionStore.session?.account.name ?? ""
            sessionStore.accountNameErrorMessage = nil
        }
    }

    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .confirmationAction) {
            Button("Save") {
                Task { await saveName() }
            }
            .disabled(isSaving || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
    }

    private func saveName() async {
        guard !isSaving else { return }
        isSaving = true
        defer { isSaving = false }

        let success = await sessionStore.submitAccountName(name)
        if success {
            sessionStore.needsAccountNamePrompt = false
        }
    }
}

#Preview {
    AccountNamePromptView()
        .environmentObject(DayOfSessionStore())
}
