package dto;

import model.enums.TableNumber;

public class OrderCreationData {

    private TableNumber tableNumber;
    private Long dishId;
    private Short guestNumber;

    public TableNumber getTableNumber() {
        return tableNumber;
    }

    public void setTableNumber(TableNumber tableNumber) {
        this.tableNumber = tableNumber;
    }

    public Long getDishId() {
        return dishId;
    }

    public void setDishId(Long dishId) {
        this.dishId = dishId;
    }

    public Short getGuestNumber() {
        return guestNumber;
    }

    public void setGuestNumber(Short guestNumber) {
        this.guestNumber = guestNumber;
    }
}
