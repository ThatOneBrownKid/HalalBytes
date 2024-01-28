class ChangeDataTypeForPriceRangeAndOverallRating < ActiveRecord::Migration[7.0]
  def up
    # change price_range to integer
    change_column :restaurants, :price_range, 'integer USING CAST(price_range AS integer)'

    # change overall_rating to float (or decimal, if you prefer)
    change_column :restaurants, :overall_rating, :float
  end

  def down
    # change price_range back to original type if you need to rollback
    change_column :restaurants, :price_range, :original_type

    # change overall_rating back to original type if you need to rollback
    change_column :restaurants, :overall_rating, :original_type
  end
end
