class MXSlider2D_V2:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "extra_pnginfo": "EXTRA_PNGINFO",
            }
        }

    RETURN_TYPES = ("INT", "INT")
    RETURN_NAMES = ("width", "height")
    FUNCTION = "get_size"
    CATEGORY = "utils/slider2d"

    def get_size(self, unique_id=None, extra_pnginfo=None):
        w, h = 1024, 1024
        try:
            if extra_pnginfo and "workflow" in extra_pnginfo:
                nodes = extra_pnginfo["workflow"].get("nodes", [])
                for node in nodes:
                    if str(node.get("id")) == str(unique_id):
                        props = node.get("properties", {})
                        w = int(props.get("width", 1024))
                        h = int(props.get("height", 1024))
                        break
        except Exception:
            pass
        return (w, h)


WEB_DIRECTORY = "./js"

NODE_CLASS_MAPPINGS = {
    "MXSlider2D_V2": MXSlider2D_V2
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "MXSlider2D_V2": "Slider 2D"
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]