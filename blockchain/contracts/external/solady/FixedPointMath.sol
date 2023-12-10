// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

library FixedPointMath {
  function fullMulDivUp(uint256 x, uint256 y, uint256 d) public pure returns (uint256 result) {
    result = fullMulDiv(x, y, d);
    /// @solidity memory-safe-assembly
    assembly {
      if mulmod(x, y, d) {
        result := add(result, 1)
        if iszero(result) {
          mstore(0x00, 0xae47f702) // `FullMulDivFailed()`.
          revert(0x1c, 0x04)
        }
      }
    }
  }

  function divUp(uint256 x, uint256 d) internal pure returns (uint256 z) {
    /// @solidity memory-safe-assembly
    assembly {
      if iszero(d) {
        mstore(0x00, 0x65244e4e) // `DivFailed()`.
        revert(0x1c, 0x04)
      }
      z := add(iszero(iszero(mod(x, d))), div(x, d))
    }
  }

  function fullMulDiv(uint256 x, uint256 y, uint256 d) public pure returns (uint256 result) {
    /// @solidity memory-safe-assembly
    assembly {
      for {

      } 1 {

      } {
        // 512-bit multiply `[p1 p0] = x * y`.
        // Compute the product mod `2**256` and mod `2**256 - 1`
        // then use the Chinese Remainder Theorem to reconstruct
        // the 512 bit result. The result is stored in two 256
        // variables such that `product = p1 * 2**256 + p0`.

        // Least significant 256 bits of the product.
        let p0 := mul(x, y)
        let mm := mulmod(x, y, not(0))
        // Most significant 256 bits of the product.
        let p1 := sub(mm, add(p0, lt(mm, p0)))

        // Handle non-overflow cases, 256 by 256 division.
        if iszero(p1) {
          if iszero(d) {
            mstore(0x00, 0xae47f702) // `FullMulDivFailed()`.
            revert(0x1c, 0x04)
          }
          result := div(p0, d)
          break
        }

        // Make sure the result is less than `2**256`. Also prevents `d == 0`.
        if iszero(gt(d, p1)) {
          mstore(0x00, 0xae47f702) // `FullMulDivFailed()`.
          revert(0x1c, 0x04)
        }

        /*------------------- 512 by 256 division --------------------*/

        // Make division exact by subtracting the remainder from `[p1 p0]`.
        // Compute remainder using mulmod.
        let r := mulmod(x, y, d)
        // `t` is the least significant bit of `d`.
        // Always greater or equal to 1.
        let t := and(d, sub(0, d))
        // Divide `d` by `t`, which is a power of two.
        d := div(d, t)
        // Invert `d mod 2**256`
        // Now that `d` is an odd number, it has an inverse
        // modulo `2**256` such that `d * inv = 1 mod 2**256`.
        // Compute the inverse by starting with a seed that is correct
        // correct for four bits. That is, `d * inv = 1 mod 2**4`.
        let inv := xor(mul(3, d), 2)
        // Now use Newton-Raphson iteration to improve the precision.
        // Thanks to Hensel's lifting lemma, this also works in modular
        // arithmetic, doubling the correct bits in each step.
        inv := mul(inv, sub(2, mul(d, inv))) // inverse mod 2**8
        inv := mul(inv, sub(2, mul(d, inv))) // inverse mod 2**16
        inv := mul(inv, sub(2, mul(d, inv))) // inverse mod 2**32
        inv := mul(inv, sub(2, mul(d, inv))) // inverse mod 2**64
        inv := mul(inv, sub(2, mul(d, inv))) // inverse mod 2**128
        result := mul(
          // Divide [p1 p0] by the factors of two.
          // Shift in bits from `p1` into `p0`. For this we need
          // to flip `t` such that it is `2**256 / t`.
          or(mul(sub(p1, gt(r, p0)), add(div(sub(0, t), t), 1)), div(sub(p0, r), t)),
          // inverse mod 2**256
          mul(inv, sub(2, mul(d, inv)))
        )
        break
      }
    }
  }
}
