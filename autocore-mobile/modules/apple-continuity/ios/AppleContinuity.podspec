Pod::Spec.new do |s|
  s.name           = 'AppleContinuity'
  s.version        = '1.0.0'
  s.summary        = 'NSUserActivity webpageURL publisher for Handoff'
  s.description    = 'Advertises the current workspace URL as NSUserActivityTypeBrowsingWeb so Continuity can continue it on Mac.'
  s.license        = 'UNLICENSED'
  s.author         = 'AutoCore'
  s.homepage       = 'https://myautocore.com'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = 'AppleContinuityModule.swift'
  s.frameworks = 'Foundation'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }
end
