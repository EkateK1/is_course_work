package model.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import model.enums.TableNumber;
import model.enums.TableStatus;

import java.time.OffsetDateTime;

@Entity
@Table(name = "journal_log")
@Getter
@Setter
public class JournalLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "table_status", nullable = false)
    private TableStatus tableStatus;

    @ManyToOne
    @JoinColumn(name = "id_employee", nullable = false)
    private Employee employee;

    @Column(name = "table_number", nullable = false)
    @Enumerated(EnumType.STRING)
    private TableNumber tableNumber;

    @Column(nullable = false)
    private OffsetDateTime time;
}
