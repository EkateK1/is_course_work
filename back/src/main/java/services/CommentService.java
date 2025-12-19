package services;

import db.CommentDAO;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import model.entities.Comment;

@RequestScoped
public class CommentService {

    @Inject
    CommentDAO commentDAO;
}
