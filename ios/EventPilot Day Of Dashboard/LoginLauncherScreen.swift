//
//  LoginLauncherScreen.swift
//  EventPilot Day Of Dashboard
//
//  Created by Jack Crane on 9/29/25.
//

import SwiftUI

struct LoginLauncherScreen: View {
    var body: some View {
        VStack {
            VStack(alignment: .leading) {
//                Image("myImage")
//                    .renderingMode(.original)
//                    .resizable()
//                    .aspectRatio(contentMode: .fit)
//                    .frame(width: 75)
//                    .clipped()
                Text("EventPilot")
                    .font(.system(.largeTitle, weight: .medium))
                Text("Run your event smoothly with the EventPilot Day-Of Dashboard")
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.leading)
            }
            .padding(.vertical)
            .frame(maxWidth: .infinity)
            .clipped()
            .background {
                Group {
                    
                }
            }
            .padding()
            Text("Create a day-of-dashboard access pin from the EventPilot admin dashboard")
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.leading)
                .padding(.vertical)
                .frame(maxWidth: .infinity)
                .clipped()
                .background {
                    Group {
                        
                    }
                }
                .padding(.horizontal)
            Spacer()
            VStack {
                Button(action: { }, label: {
                    Text("Enter an access pin")
                        .padding(4)
                        .frame(maxWidth: .infinity)
                        .clipped()
                        .foregroundStyle(.primary)
                })
                    .buttonStyle(.bordered)
                .tint(.blue)
                .foregroundStyle(.gray)
            }
            .font(.system(.title3, weight: .medium))
            .frame(width: 290)
            .clipped()
            Spacer()
                .frame(height: 48)
                .clipped()
        }
        .frame(maxWidth: .infinity)
        .clipped()
        .padding(.top, 96)
        .overlay(alignment: .top) {
            Group {
                
            }
        }
    }
}

#Preview {
    LoginLauncherScreen()
}
