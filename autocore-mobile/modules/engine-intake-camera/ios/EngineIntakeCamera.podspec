Pod::Spec.new do |s|
  s.name           = 'EngineIntakeCamera'
  s.version        = '1.0.0'
  s.summary        = 'Native AVFoundation camera feed for engine intake inspection'
  s.description    = 'SwiftUI + AVCaptureSession camera with iOS Camera chrome and Liquid Glass controls.'
  s.license        = 'UNLICENSED'
  s.author         = 'AutoCore'
  s.homepage       = 'https://myautocore.com'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  # Listed, not globbed: a newly added Swift file was invisible to the
  # development pod until the next `pod install`, which compiled as
  # "cannot find CameraFocusBracket in scope".
  s.source_files = [
    'EngineIntakeCameraModule.swift',
    'EngineIntakeCameraView.swift',
    'CameraService.swift',
    'CameraPreviewRepresentable.swift',
    'CameraChrome.swift',
    'GlassHUDOverlay.swift',
  ]
  s.frameworks = 'AVFoundation', 'UIKit', 'SwiftUI'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }
end
