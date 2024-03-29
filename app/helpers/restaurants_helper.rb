module RestaurantsHelper
  def extract_time(full_time, part)
    return nil if full_time.blank? || full_time.length != 8
    time_str = part == :open ? full_time[0..3] : full_time[4..7]
    # Insert a colon to create a valid time string for parsing
    time_str = time_str.insert(2, ':')
  
    # Parse the string into a Time object
    parsed_time = Time.parse(time_str)
  
    # Format the time into a 12-hour format with AM/PM
    # The %I specifier handles the conversion of "00" to "12" for 12 AM
    parsed_time.strftime('%I:%M %p').gsub(' 12:', ' 12:00 ') # Using gsub to replace '12:' with '12:00 ' for 12 AM
  rescue
    nil
  end
end
