package com.ecommerce.controller;

import com.ecommerce.entity.CartItem;
import com.ecommerce.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<List<CartItem>> getCartItems(Authentication authentication) {
        String userEmail = authentication.getName();
        return ResponseEntity.ok(cartService.getCartItems(userEmail));
    }

    @PostMapping
    public ResponseEntity<CartItem> addToCart(@RequestParam Long productId, @RequestParam Integer quantity, Authentication authentication) {
        String userEmail = authentication.getName();
        return ResponseEntity.ok(cartService.addToCart(userEmail, productId, quantity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CartItem> updateCartItemQuantity(@PathVariable Long id, @RequestParam Integer quantity) {
        return ResponseEntity.ok(cartService.updateCartItemQuantity(id, quantity));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removeCartItem(@PathVariable Long id) {
        cartService.removeCartItem(id);
        return ResponseEntity.ok().build();
    }
}
