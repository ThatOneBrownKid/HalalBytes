module ApplicationHelper

    def process_image_for_carousel(image, width, height)
        image.variant(
          resize_to_fill: [width, height, { gravity: 'Center' }]
          # Note: MiniMagick backend might not directly support 'background' option in the same way
        )
      end

end
