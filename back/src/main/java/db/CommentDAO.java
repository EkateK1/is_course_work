package db;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import model.entities.Comment;
import utils.JPAUtil;

@ApplicationScoped
public class CommentDAO {

    private final EntityManager em;

    public CommentDAO(){
        em = JPAUtil.getEntityManager();
    }
}
