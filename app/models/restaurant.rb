class Restaurant < ApplicationRecord
  has_many_attached :images


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
  
    # Convert to 12-hour format
    formatted_open = "#{open_hour > 12 ? open_hour - 12 : open_hour}:#{open_min.to_s.rjust(2, '0')} #{open_hour >= 12 ? 'PM' : 'AM'}"
    formatted_close = "#{close_hour > 12 ? close_hour - 12 : close_hour}:#{close_min.to_s.rjust(2, '0')} #{close_hour >= 12 ? 'PM' : 'AM'}"
  
    # If minutes are 00, simplify the format
    formatted_open = formatted_open.gsub(':00', '')
    formatted_close = formatted_close.gsub(':00', '')
  
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

end
