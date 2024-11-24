class Restaurant < ApplicationRecord
  has_many_attached :images
  geocoded_by :address
  after_validation :geocode
  before_save :ensure_website_format
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

  private 

  def ensure_website_format
    if website.present? && !website.start_with?('http://', 'https://')
      self.website = "https://www.#{website}"
    end
  end

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
