Pod::Spec.new do |s|
  s.name           = 'BackgroundExecution'
  s.version        = '1.0.0'
  s.summary        = 'iOS beginBackgroundTask for intake photo sync'
  s.description    = 'Keeps JS running briefly after the app leaves the foreground so intake photos can finish prepare and finalize.'
  s.license        = 'UNLICENSED'
  s.author         = 'AutoCore'
  s.homepage       = 'https://myautocore.com'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }
end
