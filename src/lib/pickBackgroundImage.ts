import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

/**
 * Luồng chọn ảnh nền dùng chung: mở thư viện ảnh, lấy ảnh về dạng data URL
 * (base64 jpeg) để lưu vào store — chạy được cả web lẫn native và sống sót
 * qua reload (zustand persist vào AsyncStorage / localStorage).
 *
 * Kết quả phân biệt rõ 3 trường hợp để UI phản hồi thân thiện:
 * - "ok": có dataUrl đã qua kiểm soát dung lượng.
 * - "cancelled": người dùng đóng trình chọn ảnh, không cần thông báo.
 * - "denied": bị từ chối quyền thư viện ảnh (native).
 * - "error": lỗi khác hoặc ảnh quá lớn, kèm message hiển thị cho người dùng.
 */
export type PickBackgroundResult =
  | { status: "ok"; dataUrl: string }
  | { status: "cancelled" }
  | { status: "denied" }
  | { status: "error"; message: string };

/** Quá ngưỡng này (ký tự data URL) thì thử thu nhỏ trên web. */
const SHRINK_THRESHOLD = 2_200_000;
/** Quá ngưỡng này sau mọi nỗ lực thì từ chối: tránh phình bộ nhớ persist. */
const HARD_LIMIT = 4_000_000;
const MAX_WEB_WIDTH = 1280;

/**
 * Thu nhỏ một data URL ảnh bằng canvas (chỉ web): vẽ lại ở chiều rộng tối đa
 * 1280px và xuất jpeg 0.78. Mọi lỗi đều throw để nơi gọi tự quyết định.
 */
function shrinkDataUrlOnWeb(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const g = globalThis as unknown as {
      document?: {
        createElement: (tag: string) => unknown;
      };
    };
    if (!g.document) {
      reject(new Error("Không có document để thu nhỏ ảnh."));
      return;
    }
    const img = g.document.createElement("img") as HTMLImageElement;
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_WEB_WIDTH / (img.naturalWidth || MAX_WEB_WIDTH));
        const width = Math.max(1, Math.round((img.naturalWidth || MAX_WEB_WIDTH) * scale));
        const height = Math.max(1, Math.round((img.naturalHeight || width) * scale));
        const canvas = g.document!.createElement("canvas") as HTMLCanvasElement;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Không tạo được canvas."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Thu nhỏ ảnh thất bại."));
      }
    };
    img.onerror = () => reject(new Error("Không đọc được ảnh đã chọn."));
    img.src = dataUrl;
  });
}

export async function pickBackgroundImage(): Promise<PickBackgroundResult> {
  try {
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return { status: "denied" };
      }
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    });

    if (picked.canceled || !picked.assets?.length) {
      return { status: "cancelled" };
    }

    const asset = picked.assets[0];
    if (!asset.base64) {
      return {
        status: "error",
        message: "Không đọc được ảnh này. Em thử chọn ảnh khác nhé.",
      };
    }

    const mimeType = asset.mimeType ?? "image/jpeg";
    let dataUrl = `data:${mimeType};base64,${asset.base64}`;

    if (dataUrl.length > SHRINK_THRESHOLD) {
      if (Platform.OS === "web") {
        try {
          dataUrl = await shrinkDataUrlOnWeb(dataUrl);
        } catch {
          // Thu nhỏ lỗi thì giữ bản gốc, vẫn còn vòng kiểm tra giới hạn cứng.
        }
      }
      if (dataUrl.length > HARD_LIMIT) {
        return {
          status: "error",
          message:
            "Ảnh này lớn quá nên chưa đặt làm nền được. Em chọn ảnh nhẹ hơn nhé.",
        };
      }
    }

    return { status: "ok", dataUrl };
  } catch {
    return {
      status: "error",
      message: "Đã có lỗi khi chọn ảnh. Em thử lại sau nhé.",
    };
  }
}
