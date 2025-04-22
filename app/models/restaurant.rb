class Restaurant < ApplicationRecord
  has_many_attached :images
  has_many :reviews, dependent: :destroy
  geocoded_by :address
  after_validation :geocode

  validate :image_count_within_limit, on: :create
  validates :phone, format: { with: /\(\d{3}\) \d{3}-\d{4}/, message: "must be in the format (xxx) xxx-xxxx" }

  def open?
    current_day = Time.now.strftime('%A').downcase
    
    hours_today = self.send(current_day) # Access the appropriate column for the current day
    
    # Handle nil gracefully
    return false if hours_today.nil? || hours_today.empty?
  
    open_time = hours_today[0..3].to_i
    close_time = hours_today[4..7].to_i
  
    current_time = Time.now.strftime('%H%M').to_i
    
    if close_time < open_time # This means the restaurant closes after midnight
      if current_time >= open_time || current_time < close_time
        true
      else
        false
      end
    else
      if open_time <= current_time && current_time < close_time
        true
      else
        false
      end
    end
  end

  def format_hours(hours_str)
    return nil if hours_str.nil? || hours_str.length != 8
  
    # Extract hours and minutes for opening and closing times
    open_hour, open_min = hours_str[0..1].to_i, hours_str[2..3].to_i
    close_hour, close_min = hours_str[4..5].to_i, hours_str[6..7].to_i
  
    # Function to format the hour
    format_hour = ->(hour, min) {
      hour_in_12hr = hour % 12
      hour_in_12hr = 12 if hour_in_12hr == 0 # Adjust for midnight and noon to show as 12
      formatted_time = "#{hour_in_12hr}:#{min.to_s.rjust(2, '0')} #{hour >= 12 ? 'PM' : 'AM'}"
      
      # If minutes are 00, simplify the format by removing :00
      formatted_time.gsub(':00', '')
    }
  
    formatted_open = format_hour.call(open_hour, open_min)
    formatted_close = format_hour.call(close_hour, close_min)
  
    "#{formatted_open} - #{formatted_close}"
  end
  
  def hours(day)
    day = day.downcase
    hours_on_given_day = self.send(day)
    format_hours(hours_on_given_day)
  end

  def ordered_images
    images.joins(:blob).order("active_storage_attachments.position ASC")
  end

  def address
    [street, city, state, zip_code].compact.join(', ')
  end

  def reviews_count
    reviews.count # This will run a COUNT query each time it's called
  end

  def cuisine_image_exists?(cuisine)
    return false if cuisine.blank?
    image_filename = "#{cuisine.parameterize}.png"
    begin
      !!Rails.application.assets.resolve(image_filename, content_type: 'image/png')
    rescue Sprockets::FileNotFound
      false
    end

  end

  FILTER_CATEGORIES = {
    # === Popular Item-Based Categories ===
    'Pizza' => [
      'Pizza'
    ],
    'Burgers' => [
      'Burgers',
      'Hot Dogs' # Often found at burger places
    ],
    'Sandwiches & Wraps' => [
      'Sandwiches',
      'Wraps',
      'Deli',
      'Cheesesteaks',
      'Bagels', # Often function as sandwiches
      'Paninis', # Assuming you add this
      'Subs'     # Assuming you add this
    ],
    'Chicken & Wings' => [
      'Chicken', # Generic chicken shops
      'Wings',
      'Fried Chicken'
    ],
    'Sushi' => [ # Kept separate due to high search volume
      'Sushi',
      'Poke' # Often served at Sushi places or similar style
    ],
    'Tacos' => [ # Kept separate due to high search volume
      'Tacos'
    ],
    'Bubble Tea' => [
      'Bubble Tea'
    ],

    # === Regional/National Cuisine Categories ===
    'Mexican & Latin American' => [
      'Mexican',
      'Latin American',
      'Burritos',
      'Empanadas',
      'Tex-Mex',
      'Peruvian',
      'Colombian',
      'Brazilian',
      'Argentinian',
      'Cuban',
      'Puerto Rican',
      'Salvadoran',
      'Venezuelan',
      'South American',
      'Caribbean' # Closely related for Browse
    ],
    'Asian (General)' => [ # For broad Browse or less common types
      'Asian',
      'Asian Fusion',
      'Mongolian',
      'Tibetan',
      'Southeast Asian' # Broad
    ],
    'Chinese' => [
      'Chinese',
      'Dim Sum',
      'Taiwanese' # Often grouped or similar
    ],
    'Japanese' => [ # Excludes Sushi here as it has its own category
      'Japanese',
      'Ramen',
      'Donburi' # Assuming you add this
    ],
    'Korean' => [
      'Korean'
    ],
    'Thai & Vietnamese' => [ # Often searched together or have similar profiles
      'Thai',
      'Vietnamese',
      'Pho'
    ],
    'Indian & South Asian' => [
      'Indian',
      'Pakistani',
      'Afghan',
      'Sri Lankan',
      'Nepalese' # Assuming you add this
    ],
    'Italian' => [
      'Italian',
      'Pasta' # Primarily associated with Italian
    ],
    'Mediterranean' => [
      'Mediterranean',
      'Greek',
      'Gyros',
      'Spanish',   # Often shares ingredients/styles
      'Portuguese',# Often shares ingredients/styles
      'Tapas'
    ],
    'Middle Eastern' => [
      'Middle Eastern',
      'Lebanese',
      'Turkish',
      'Persian',
      'Kebab',
      'Egyptian'
    ],
    'American' => [
      'American',
      'New American',
      'Southern',
      'Soul Food',
      'Diner',
      'Comfort Food',
      'Barbeque', # Or BBQ
      'Steakhouse',
      'Californian'
    ],
    'European (Other)' => [ # Catches European not covered above
      'European',
      'French',
      'German',
      'British',
      'Irish',
      'Polish',
      'Russian',
      'Ukrainian',
      'Belgian',
      'Eastern European',
      'Modern European',
      'Scandinavian'
    ],
    'African' => [
      'African',
      'Ethiopian',
      'Moroccan',
      'Nigerian',
      'North African',
      'West African',
      'South African',
      'Senegalese',
      'Egyptian' # Could also fit Middle Eastern, place based on local context
    ],
    'Hawaiian' => [ # Distinct enough
        'Hawaiian',
        # Poke might fit here too, but often associated/filtered with Sushi
    ],

    # === Meal Type / Style Categories ===
    'Breakfast & Brunch' => [
      'Breakfast & Brunch',
      'Waffles',
      'Crepes',
      'Pancakes' # Assuming you add this
      # Bagels could fit here too, primary is Sandwiches though
    ],
    'Bakery & Desserts' => [
      'Bakery',
      'Desserts',
      'Cupcakes',
      'Pastries',
      'Donuts',
      'Ice Cream & Frozen Yogurt',
      'Cookies' # Assuming you add this
    ],
    'Coffee & Tea' => [
      'Coffee & Tea'
    ],
    'Healthy' => [
      'Healthy',
      'Salads',
      'Acai Bowls',
      'Juice & Smoothies',
      'Wraps' # Often seen as a healthy alternative
    ],
    'Fast Food' => [
      'Fast Food',
      'Fries' # Strongly associated
    ],
    'Seafood' => [
      'Seafood',
      'Fish & Chips'
    ],
    'Soup' => [
      'Soup'
    ],
    'Pub Food' => [
      'Pub Food',
      'Gastropub',
      'Fish & Chips' # Fits here too
    ],
    'Street Food' => [ # Style rather than origin
      'Street Food'
      # Tacos, Empanadas, Kebabs etc. could *also* be tagged this, but primary filter is cuisine type
    ],
    'Convenience & Grocery' => [
        'Grocery',
        # Maybe snacks, drinks etc if you add them
    ],

    # === Dietary / Cultural Categories (Often separate filters but can be primary) ===
    'Halal' => [
      'Halal'
    ],
    'Vegan' => [
      'Vegan'
    ],
    'Vegetarian' => [
      'Vegetarian'
    ],
    'Gluten-Free Friendly' => [ # Use "Friendly" as places might not be 100% certified GF
        'Gluten-Free',
    ],
    'Kosher' => [
        'Kosher',
    ],

    # === Other / Uncategorized ===
    # Catch-all or items needing specific placement
    'Other' => [
      'Australian',
      'Canadian',
      'Kids Menu',
      'Fondue',
      'Poutine',
      'Contemporary', # If not American/European
      'Fusion'        # If not Asian Fusion specifically
      # Add any remaining from your list here
    ]
  }

  private 

  def image_count_within_limit
    if images.attached? && images.length > 10
      errors.add(:images, "Too many files uploaded. Maximum is 10.")
    end
  end

  def geocode_with_logging
    result = Geocoder.search(self.address)
    if result.first.present?
      Rails.logger.info "Geocoding successful: #{result.first.to_json}"
      self.latitude = result.first.latitude
      self.longitude = result.first.longitude
    else
      Rails.logger.error "Geocoding failed for address: #{self.address}"
    end
  rescue JSON::ParserError => e
    Rails.logger.error "Invalid JSON response: #{e.message}"
  end

  def self.filtered_results(params)
    restaurants = Restaurant.all

    # Apply cuisine filter if present
    if params[:cuisine].present?
      restaurants = restaurants.where(cuisine: params[:cuisine])
    end

    # Apply price filter if present
    if params[:price].present?
      restaurants = restaurants.where(price_range: params[:price])
    end

    # Apply rating filter if present
    if params[:rating].present?
      restaurants = restaurants.where("overall_rating >= ?", params[:rating].to_f)
    end
    


    restaurants
  end

  

end
