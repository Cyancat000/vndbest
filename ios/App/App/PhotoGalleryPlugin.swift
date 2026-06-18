import Capacitor
import Photos

@objc(PhotoGalleryPlugin)
public class PhotoGalleryPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PhotoGalleryPlugin"
    public let jsName = "PhotoGallery"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveImage", returnType: CAPPluginReturnPromise)
    ]

    @objc func saveImage(_ call: CAPPluginCall) {
        guard let imageUrl = call.getString("url"), let url = URL(string: imageUrl) else {
            call.reject("Image URL is required")
            return
        }

        let fileName = call.getString("fileName") ?? "vndbest-image.jpg"

        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            guard status == .authorized || status == .limited else {
                call.reject("Photo library permission denied")
                return
            }

            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let data = try Data(contentsOf: url)
                    let options = PHAssetResourceCreationOptions()
                    options.originalFilename = fileName

                    PHPhotoLibrary.shared().performChanges({
                        let request = PHAssetCreationRequest.forAsset()
                        request.addResource(with: .photo, data: data, options: options)
                    }, completionHandler: { success, error in
                        if success {
                            call.resolve()
                        } else {
                            call.reject("Failed to save image to photo library", nil, error)
                        }
                    })
                } catch {
                    call.reject("Failed to download image", nil, error)
                }
            }
        }
    }
}
