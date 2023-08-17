class Restaurant < ApplicationRecord
    has_many_attached :images

    def current_open_status
        current_day = Time.now.strftime("%A").downcase
        current_time = Time.now.strftime("%I:%M %p")
        puts "Current Day: #{current_day}"
        puts "Current Time: #{current_time}"
      
        day_hours = send(current_day) rescue nil
      
        if day_hours.present?
          open_time_str, close_time_str = day_hours.split("-").map(&:strip)
          
          open_time_str.gsub!(/[^\dAPapm]/, "")
          close_time_str.gsub!(/[^\dAPapm]/, "")
      
          open_time = Time.strptime(open_time_str, "%I%p")
          close_time = Time.strptime(close_time_str, "%I%p")
      
          if current_time.between?(open_time.strftime("%I:%M %p"), close_time.strftime("%I:%M %p"))
            "Open"
          else
            "Closed"
          end
        else
          "Opening hours not available"
        end
      end      
end
