import Capacitor

public class MainViewController: CAPBridgeViewController {
    public override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(PhotoGalleryPlugin())
    }
}
