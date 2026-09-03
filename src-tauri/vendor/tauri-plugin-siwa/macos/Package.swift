// swift-tools-version: 5.7
import PackageDescription

let package = Package(
    name: "siwa-macos",
    platforms: [
        .macOS(.v10_15)
    ],
    products: [
        .library(
            name: "siwa-macos",
            type: .static,
            targets: ["siwa-macos"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/Brendonovich/swift-rs", from: "1.0.5")
    ],
    targets: [
        .target(
            name: "siwa-macos",
            dependencies: [
                .product(name: "SwiftRs", package: "swift-rs")
            ],
            path: "Sources",
            linkerSettings: [
                .linkedFramework("AppKit"),
                .linkedFramework("AuthenticationServices"),
                .linkedFramework("WebKit")
            ]
        )
    ]
)
