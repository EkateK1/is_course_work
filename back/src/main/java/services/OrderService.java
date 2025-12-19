package services;

import db.DishDAO;
import db.JournalDAO;
import db.OrderDAO;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.PathParam;
import model.entities.Dish;
import model.entities.JournalLog;
import model.entities.Order;
import model.enums.OrderStatus;
import model.enums.TableNumber;
import model.enums.TableStatus;

import java.time.OffsetDateTime;
import java.util.List;

@RequestScoped
public class OrderService {

    @Inject
    OrderDAO orderDAO;


    @Inject
    JournalDAO journalDAO;

    @Inject
    JournalService journalService;

    @Inject
    DishDAO dishDAO;


    public long create(TableNumber tableNumber, Long dishId, Short guestNumber) {

        TableStatus tableStatus = journalService.getTableStatus(tableNumber);
        if (tableStatus != TableStatus.occupied) {
            throw new IllegalArgumentException("Заказ можно оформить только для занятого стола");
        }


        JournalLog journalLog = journalDAO.findLastByTableNumber(tableNumber);
        if (journalLog == null) {
            throw new IllegalArgumentException("Для этого стола нет записей в журнале логов");
        }


        Dish dish = dishDAO.findById(dishId);
        if (dish == null) {
            throw new IllegalArgumentException("Блюдо с заданным id не найдено");
        }


        Order order = new Order();
        order.setJournalLog(journalLog);
        order.setDish(dish);
        order.setGuestNumber(guestNumber);
        order.setStatus(OrderStatus.accepted);
        order.setTime(OffsetDateTime.now());

        try {

            orderDAO.create(order);
            return order.getId();

        } catch (Exception e) {
            Throwable cause = e;
            while (cause.getCause() != null) {
                cause = cause.getCause();
            }

            if (cause instanceof org.postgresql.util.PSQLException psqlEx) {
                String msg = psqlEx.getServerErrorMessage() != null
                        ? psqlEx.getServerErrorMessage().getMessage()
                        : psqlEx.getMessage();

                throw new IllegalArgumentException(msg);
            }

            throw e;
        }
    }

    public List<Order> getAll() {
        return orderDAO.findAll();
    }

    public Order findById(Long id) {
        return orderDAO.findById(id);
    }


    public void modify(Order incoming) {

        Order existing = orderDAO.findById(incoming.getId());
        if (existing == null) {
            throw new IllegalArgumentException("Заказа с таким id нет");
        }


        existing.setGuestNumber(incoming.getGuestNumber());


        orderDAO.modify(existing);
    }

    public void delete(Long id) {
        Order order = orderDAO.findById(id);
        if (order == null) {
            throw new IllegalArgumentException("Заказа с таким id нет");
        }
        boolean isInBill = orderDAO.isInBill(order);
        if (isInBill) {
            throw new IllegalArgumentException("Заказ нельзя удалить, так как он уже в счете");
        }
        orderDAO.delete(order);
    }

    public void changeStatus(Long orderId, OrderStatus newStatus, String role) {
        Order existing = orderDAO.findById(orderId);
        if (existing == null) {
            throw new IllegalArgumentException("Заказа с таким id нет");
        }

        OrderStatus current = existing.getStatus();

        if ("admin".equals(role)) {
            existing.setStatus(newStatus);
            orderDAO.modify(existing);
            return;
        }

        if ("cook".equals(role) || "barman".equals(role)) {
            if (current == OrderStatus.accepted && newStatus == OrderStatus.cooked) {
                existing.setStatus(newStatus);
                orderDAO.modify(existing);
                return;
            } else {
                throw new IllegalArgumentException("Повар или бармен может менять статус только с accepted на cooked");
            }
        }

        if ("waiter".equals(role)) {
            if (current == OrderStatus.cooked && newStatus == OrderStatus.delivered) {
                existing.setStatus(newStatus);
                orderDAO.modify(existing);
                return;
            } else {
                throw new IllegalArgumentException("Официант может менять статус только с cooked на delivered");
            }
        }

        throw new IllegalArgumentException("Нет доступа к изменению статуса");
    }

    public List<Order> getLastForTable(TableNumber tableNumber) {
        JournalLog journalLog = journalDAO.findLastByTableNumber(tableNumber);
        if (journalLog == null) {
            throw new IllegalArgumentException("Для этого стола нет записей");
        }
        if (journalLog.getTableStatus() != TableStatus.occupied
                && journalLog.getTableStatus() != TableStatus.free) {
            journalLog = journalService.getLastOccupiedLogForTableNumber(tableNumber);
        }
        return orderDAO.findByJournalLog(journalLog.getId());
    }
}
