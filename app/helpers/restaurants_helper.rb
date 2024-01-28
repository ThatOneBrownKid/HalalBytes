module RestaurantsHelper
    def extract_time(full_time, part)
        return nil if full_time.blank? || full_time.length != 8
        time_str = part == :open ? full_time[0..3] : full_time[4..7]
        Time.parse(time_str.insert(2, ':')).strftime('%H:%M') rescue nil
      end
end
