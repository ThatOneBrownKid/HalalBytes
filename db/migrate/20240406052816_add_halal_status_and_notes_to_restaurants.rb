class AddHalalStatusAndNotesToRestaurants < ActiveRecord::Migration[7.0]
  def change
    add_column :restaurants, :halal_status, :string
    add_column :restaurants, :notes, :string
  end
end
