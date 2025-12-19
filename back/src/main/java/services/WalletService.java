package services;

import db.WalletDAO;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import model.entities.Employee;
import model.entities.Wallet;

import java.math.BigDecimal;

@RequestScoped
public class WalletService {

    @Inject
    WalletDAO walletDAO;

    public void create(Employee employee) {
        Wallet wallet = new Wallet();
        wallet.setEmployee(employee);
        wallet.setBalance(BigDecimal.ZERO);
        walletDAO.create(wallet);
    }

    public BigDecimal getBalance(Long employeeId) {
        BigDecimal balance = walletDAO.getBalanceOrNull(employeeId);
        if (balance == null) {
            throw new IllegalArgumentException("У сотрудника нет кошелька для чаевых");
        }
        return balance;
    }

    public void withdrawal(Long employeeId, BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            throw new IllegalArgumentException("Сумма для снятия должна быть положительной");
        }

        try {

            walletDAO.withdrawal(employeeId, amount);

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
}
