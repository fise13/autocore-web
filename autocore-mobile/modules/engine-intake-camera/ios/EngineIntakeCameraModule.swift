import ExpoModulesCore

#if os(iOS)

public class EngineIntakeCameraModule: Module {
  public func definition() -> ModuleDefinition {
    Name("EngineIntakeCamera")

    // EventDispatchers on EngineIntakeCameraProps are discovered via Mirror.
    View(EngineIntakeCameraView.self)
  }
}

#endif
